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

  private static isClient(): boolean {
    return typeof window !== "undefined"
  }

  static async getAllTemplates(): Promise<EnhancedCredentialTemplate[]> {
    const staticTemplatesEnhanced: EnhancedCredentialTemplate[] = staticTemplates.map((template) => ({
      ...template,
      source: "static" as const,
    }))

    const syncedTemplates = this.getSyncedTemplates()

    // Combine static and synced templates, avoiding duplicates
    const allTemplates = [...staticTemplatesEnhanced]

    syncedTemplates.forEach((syncedTemplate) => {
      // Check if a static template with the same ID exists
      const existingIndex = allTemplates.findIndex((t) => t.id === syncedTemplate.id)
      if (existingIndex >= 0) {
        // Replace static template with synced version if it exists
        allTemplates[existingIndex] = syncedTemplate
      } else {
        // Add new synced template
        allTemplates.push(syncedTemplate)
      }
    })

    return allTemplates
  }

  static getSyncedTemplates(): EnhancedCredentialTemplate[] {
    if (!this.isClient()) {
      return []
    }

    try {
      const stored = localStorage.getItem(this.SYNCED_TEMPLATES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load synced templates:", error)
      return []
    }
  }

  static saveSyncedTemplates(templates: EnhancedCredentialTemplate[]): void {
    if (!this.isClient()) {
      return
    }

    try {
      localStorage.setItem(this.SYNCED_TEMPLATES_KEY, JSON.stringify(templates))
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
    const config = VCMConfigManager.getConfig()
    if (!config || !config.enabled) {
      return {
        success: false,
        synced: 0,
        errors: ["VCM連携が有効になっていません"],
        templates: [],
      }
    }

    try {
      // Use VCMBrowserClient for browser-safe operations
      const client = new VCMBrowserClient(config, true) // Use mock data for demo
      const vcmTypes = await client.getCredentialTypes()

      const syncedTemplates: EnhancedCredentialTemplate[] = []
      const errors: string[] = []

      for (const vcmType of vcmTypes) {
        try {
          const template = this.convertVCMTypeToTemplate(vcmType)
          syncedTemplates.push(template)
        } catch (error) {
          errors.push(`Failed to convert ${vcmType.name}: ${error instanceof Error ? error.message : "不明なエラー"}`)
        }
      }

      // Save synced templates
      this.saveSyncedTemplates(syncedTemplates)

      // Update last sync time
      VCMConfigManager.updateLastSync()

      return {
        success: errors.length === 0,
        synced: syncedTemplates.length,
        errors,
        templates: syncedTemplates,
      }
    } catch (error) {
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "同期に失敗しました"],
        templates: [],
      }
    }
  }

  private static convertVCMTypeToTemplate(vcmType: any): EnhancedCredentialTemplate {
    const claims = Object.entries(vcmType.schema.properties).map(([key, property]: [string, any]) => ({
      key,
      name: property.title,
      description: property.description,
      type: this.mapSchemaTypeToClaimType(property.type, property.format),
      required: vcmType.schema.required.includes(key),
      selectiveDisclosure: property.selectiveDisclosure || false,
      defaultValue: property.default,
      enum: property.enum,
    }))

    return {
      id: vcmType.id,
      name: vcmType.display.name,
      description: vcmType.display.description,
      type: vcmType.issuanceConfig.type,
      context: vcmType.issuanceConfig.context,
      claims,
      display: {
        name: vcmType.display.name,
        locale: vcmType.display.locale,
        backgroundColor: vcmType.display.backgroundColor,
        textColor: vcmType.display.textColor,
        logo: vcmType.display.logo,
      },
      validityPeriod: vcmType.issuanceConfig.validityPeriod,
      issuer: vcmType.issuanceConfig.issuer,
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
    const allTemplates = await this.getAllTemplates()
    return allTemplates.find((template) => template.id === templateId)
  }

  static clearSyncedTemplates(): void {
    if (this.isClient()) {
      try {
        localStorage.removeItem(this.SYNCED_TEMPLATES_KEY)
      } catch (error) {
        console.error("Failed to clear synced templates:", error)
      }
    }
  }

  static async refreshTemplates(): Promise<EnhancedCredentialTemplate[]> {
    // Force refresh by re-reading from storage
    return this.getAllTemplates()
  }
}
