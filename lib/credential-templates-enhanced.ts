import { credentialTemplates as staticTemplates, type CredentialTemplate } from "./credential-templates"
import { VCMBrowserClient } from "./vcm-client-browser"
import { VCMConfigManager } from "./vcm-config"

export interface EnhancedCredentialTemplate extends CredentialTemplate {
  source: "static" | "vcm"
  vcmId?: string
  lastSynced?: string
  syncStatus?: "synced" | "error" | "pending"
}

export class CredentialTemplateManager {
  private static SYNCED_TEMPLATES_KEY = "vcm_synced_templates"
  private static cachedTemplates: EnhancedCredentialTemplate[] | null = null
  private static lastCacheTime = 0
  private static CACHE_TTL = 30000 // 30秒キャッシュ

  private static isClient(): boolean {
    return typeof window !== "undefined"
  }

  static async getAllTemplates(): Promise<EnhancedCredentialTemplate[]> {
    console.log("CredentialTemplateManager.getAllTemplates called")

    // キャッシュが有効な場合はキャッシュを返す
    const now = Date.now()
    if (this.cachedTemplates && now - this.lastCacheTime < this.CACHE_TTL) {
      console.log("Returning cached templates:", this.cachedTemplates.length)
//      return this.cachedTemplates
    }

    const staticTemplatesEnhanced: EnhancedCredentialTemplate[] = staticTemplates.map((template) => ({
      ...template,
      source: "static" as const,
    }))

    const syncedTemplates = this.getSyncedTemplates()
    console.log("Synced templates loaded:", syncedTemplates.length)
    console.log(
      "Synced templates details:",
      syncedTemplates.map((t) => ({ id: t.id, name: t.name, source: t.source })),
    )

    // Combine static and synced templates, avoiding duplicates
    const allTemplates = [...staticTemplatesEnhanced]

    syncedTemplates.forEach((syncedTemplate) => {
      // Check if a static template with the same ID exists
      const existingIndex = allTemplates.findIndex((t) => t.id === syncedTemplate.id)
      if (existingIndex >= 0) {
        // Replace static template with synced version if it exists
        console.log("Replacing static template with synced version:", syncedTemplate.id)
        allTemplates[existingIndex] = syncedTemplate
      } else {
        // Add new synced template
        console.log("Adding new synced template:", syncedTemplate.id)
        allTemplates.push(syncedTemplate)
      }
    })

    // キャッシュを更新
    this.cachedTemplates = allTemplates
    this.lastCacheTime = now

    console.log("All templates combined:", allTemplates.length)
    console.log("Template breakdown:", {
      static: allTemplates.filter((t) => t.source === "static").length,
      vcm: allTemplates.filter((t) => t.source === "vcm").length,
    })

    return allTemplates
  }

  static getSyncedTemplates(): EnhancedCredentialTemplate[] {
    if (!this.isClient()) {
      console.log("getSyncedTemplates: Not in client environment, returning empty array")
      return []
    }

    try {
      // 統一されたVCMConfigManagerを使用
      const templates = VCMConfigManager.getSyncedTemplates()
      console.log("getSyncedTemplates: Loaded templates from VCMConfigManager:", templates.length)

      // テンプレートの詳細をログ出力
      templates.forEach((template) => {
        console.log("Synced template:", {
          id: template.id,
          name: template.name,
          source: template.source,
          lastSynced: template.lastSynced,
        })
      })

      return templates
    } catch (error) {
      console.error("Failed to load synced templates:", error)
      return []
    }
  }

  static saveSyncedTemplates(templates: EnhancedCredentialTemplate[]): void {
    if (!this.isClient()) {
      console.log("saveSyncedTemplates: Not in client environment, skipping save")
      return
    }

    try {
      console.log("saveSyncedTemplates: Saving templates:", templates.length)

      // 統一されたlocalStorageキーを使用
      localStorage.setItem(this.SYNCED_TEMPLATES_KEY, JSON.stringify(templates))

      // キャッシュを無効化して次回の読み込みで最新データを取得
      this.cachedTemplates = null

      console.log("saveSyncedTemplates: Templates saved successfully")
    } catch (error) {
      console.error("Failed to save synced templates:", error)
    }
  }

  static async syncFromVCM(): Promise<{
    success: boolean
    synced: number
    errors: string[]
    templates: EnhancedCredentialTemplate[]
  }> {
    console.log("=== CredentialTemplateManager.syncFromVCM 開始 ===")
    const config = VCMConfigManager.getConfig()
    console.log(
      "VCM設定:",
      config
        ? {
            enabled: config.enabled,
            useMockData: config.useMockData,
            hasBaseUrl: !!config.baseUrl,
            hasApiKey: !!config.apiKey,
          }
        : "設定なし",
    )

    if (!config || !config.enabled) {
      console.log("VCM連携が無効です")
      return {
        success: false,
        synced: 0,
        errors: ["VCM連携が有効になっていません"],
        templates: [],
      }
    }

    try {
      // VCMBrowserClientを作成
      console.log("VCMBrowserClientを作成中...")
      const client = new VCMBrowserClient(config, config.useMockData ?? false)

      // クレデンシャルタイプを取得
      console.log("VCMからクレデンシャルタイプを取得中...")
      const vcmTypes = await client.getCredentialTypes()
      console.log("取得したVCMタイプ:", vcmTypes.length, "件")

      const syncedTemplates: EnhancedCredentialTemplate[] = []
      const errors: string[] = []

      // 各VCMタイプをテンプレートに変換
      for (const vcmType of vcmTypes) {
        try {
          console.log("VCMタイプを変換中:", vcmType.id)
          const template = this.convertVCMTypeToTemplate(vcmType)
          syncedTemplates.push(template)
          console.log("変換完了:", template.id, template.name)
        } catch (error) {
          const errorMsg = `${vcmType.name || vcmType.id}の変換に失敗: ${error instanceof Error ? error.message : "不明なエラー"}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      console.log("変換されたテンプレート:", syncedTemplates.length, "件")
      syncedTemplates.forEach((template) => {
        console.log(`- ${template.id}: ${template.name} (source: ${template.source})`)
      })

      // ローカルストレージに保存
      console.log("ローカルストレージに保存中...")
      this.saveSyncedTemplates(syncedTemplates)

      // 最終同期時刻を更新
      console.log("最終同期時刻を更新中...")
      VCMConfigManager.updateLastSync()

      // サーバーに同期
      try {
        console.log("サーバーに同期中...")
        const allTemplates = await this.getAllTemplates()
        console.log("サーバーに送信するテンプレート:", allTemplates.length, "件")

        const response = await fetch("/api/vcm/sync-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ templates: allTemplates }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log("サーバー同期成功:", result)
        } else {
          console.error("サーバー同期失敗:", response.status, response.statusText)
          errors.push("サーバーへの同期に失敗しました")
        }
      } catch (serverSyncError) {
        console.error("サーバー同期エラー:", serverSyncError)
        errors.push("サーバーへの同期でエラーが発生しました")
      }

      // キャッシュを無効化
      this.cachedTemplates = null

      const result = {
        success: errors.length === 0,
        synced: syncedTemplates.length,
        errors,
        templates: syncedTemplates,
      }

      console.log("=== 同期完了 ===")
      console.log("結果:", result)
      return result
    } catch (error) {
      console.error("=== VCM同期エラー ===", error)
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "同期に失敗しました"],
        templates: [],
      }
    }
  }

  private static convertVCMTypeToTemplate(vcmType: any): EnhancedCredentialTemplate {
    console.log("Converting VCM type to template:", vcmType.id)
    console.log("VCM type schema:", vcmType.schema)

    const claims = Object.entries(vcmType.schema?.properties || {}).map(([key, property]: [string, any]) => {
      // VCMテンプレートでは、デフォルトで多くの項目を選択的開示にする
      const isSelectiveDisclosure = property.selectiveDisclosure !== false && !["id", "type", "@context"].includes(key) // 基本的なVC項目は除外

      console.log(`Claim ${key}: selectiveDisclosure = ${isSelectiveDisclosure}`)

      return {
        key,
        name: property.title || key,
        description: property.description || `${key} field`,
        type: this.mapSchemaTypeToClaimType(property.type, property.format),
        required: (vcmType.schema?.required || []).includes(key),
        selectiveDisclosure: isSelectiveDisclosure,
        defaultValue: property.default,
        enum: property.enum,
      }
    })

    console.log(
      "Converted claims:",
      claims.map((c) => ({ key: c.key, selectiveDisclosure: c.selectiveDisclosure })),
    )

    return {
      id: vcmType.id,
      name: vcmType.display?.name || vcmType.name || vcmType.id,
      description: vcmType.display?.description || vcmType.description || "",
      type: vcmType.issuanceConfig?.type || ["VerifiableCredential"],
      context: vcmType.issuanceConfig?.context || ["https://www.w3.org/2018/credentials/v1"],
      claims,
      display: {
        name: vcmType.display?.name || vcmType.name || vcmType.id,
        locale: vcmType.display?.locale || "ja-JP",
        backgroundColor: vcmType.display?.backgroundColor || "#1e40af",
        textColor: vcmType.display?.textColor || "#ffffff",
        logo: vcmType.display?.logo,
      },
      validityPeriod: vcmType.issuanceConfig?.validityPeriod || 365,
      issuer: vcmType.issuanceConfig?.issuer || "https://university.example.com",
      source: "vcm" as const,
      vcmId: vcmType.id,
      lastSynced: new Date().toISOString(),
      syncStatus: "synced" as const,
    }
  }

  private static mapSchemaTypeToClaimType(schemaType: string, format?: string): string {
    if (format === "date" || format === "date-time") {
      return "date"
    }

    switch (schemaType) {
      case "integer":
      case "number":
        return "number"
      case "boolean":
        return "boolean"
      case "string":
      default:
        return "string"
    }
  }

  static async getTemplate(templateId: string): Promise<EnhancedCredentialTemplate | undefined> {
    console.log("getTemplate called for:", templateId)
    const allTemplates = await this.getAllTemplates()
    const template = allTemplates.find((template) => template.id === templateId)
    console.log("Template found:", template ? "yes" : "no")
    return template
  }

  static clearSyncedTemplates(): void {
    console.log("clearSyncedTemplates called")
    if (this.isClient()) {
      try {
        localStorage.removeItem(this.SYNCED_TEMPLATES_KEY)
        // キャッシュを無効化
        this.cachedTemplates = null
        console.log("Synced templates cleared")
      } catch (error) {
        console.error("Failed to clear synced templates:", error)
      }
    }
  }

  static async refreshTemplates(): Promise<EnhancedCredentialTemplate[]> {
    console.log("refreshTemplates called")
    // キャッシュを無効化して強制的に再読み込み
    this.cachedTemplates = null
    return this.getAllTemplates()
  }

  // サーバー同期状況を取得
  static async getServerSyncStatus(): Promise<{
    hasSyncedData: boolean
    lastSync: string | null
    syncedTemplatesCount: number
    syncedTemplates: Array<{ id: string; name: string; source: string }>
  }> {
    try {
      const response = await fetch("/api/vcm/sync-templates")
      if (response.ok) {
        return await response.json()
      } else {
        console.error("Failed to get server sync status:", response.status)
        return {
          hasSyncedData: false,
          lastSync: null,
          syncedTemplatesCount: 0,
          syncedTemplates: [],
        }
      }
    } catch (error) {
      console.error("Error getting server sync status:", error)
      return {
        hasSyncedData: false,
        lastSync: null,
        syncedTemplatesCount: 0,
        syncedTemplates: [],
      }
    }
  }

  // デバッグ用メソッド
  static getDebugInfo(): any {
    const syncedTemplates = this.getSyncedTemplates()
    const config = VCMConfigManager.getConfig()

    return {
      isClient: this.isClient(),
      syncedTemplatesKey: this.SYNCED_TEMPLATES_KEY,
      syncedTemplatesCount: syncedTemplates.length,
      syncedTemplates: syncedTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        source: t.source,
        lastSynced: t.lastSynced,
      })),
      vcmConfig: config
        ? {
            enabled: config.enabled,
            useMockData: config.useMockData,
            lastSync: config.lastSync,
          }
        : null,
      cacheInfo: {
        hasCachedTemplates: !!this.cachedTemplates,
        cachedCount: this.cachedTemplates?.length || 0,
        lastCacheTime: this.lastCacheTime,
        cacheAge: Date.now() - this.lastCacheTime,
      },
    }
  }
}
