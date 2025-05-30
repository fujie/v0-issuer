// Browser-safe VCM Client that uses API routes
export interface VCMConfig {
  baseUrl: string
  apiKey: string
  organizationId?: string
}

export interface VCMCredentialType {
  id: string
  name: string
  description: string
  version: string
  schema: VCMSchema
  display: VCMDisplayProperties
  issuanceConfig: VCMIssuanceConfig
  createdAt: string
  updatedAt: string
  status: "active" | "draft" | "deprecated"
  organizationId?: string
}

export interface VCMSchema {
  $schema: string
  type: "object"
  properties: Record<string, VCMSchemaProperty>
  required: string[]
  additionalProperties: boolean
}

export interface VCMSchemaProperty {
  type: string
  title: string
  description: string
  format?: string
  enum?: string[]
  selectiveDisclosure?: boolean
  required?: boolean
  default?: any
  pattern?: string
  minLength?: number
  maxLength?: number
}

export interface VCMDisplayProperties {
  name: string
  description: string
  locale: string
  backgroundColor?: string
  textColor?: string
  logo?: {
    url: string
    altText: string
  }
}

export interface VCMIssuanceConfig {
  validityPeriod: number
  issuer: string
  context: string[]
  type: string[]
  revocable: boolean
  batchIssuance: boolean
  signingAlgorithm?: string
  keyId?: string
}

export interface VCMIntegration {
  id: string
  name: string
  url: string
  apiKey: string
  webhookSecret: string
  status: "active" | "inactive"
  autoSync: boolean
  lastSync?: string
  createdAt: string
  updatedAt: string
}

export class VCMBrowserClient {
  private config: VCMConfig
  private useMockData: boolean

  constructor(config: VCMConfig, useMockData = false) {
    this.config = config
    this.useMockData = useMockData
  }

  async testConnection(): Promise<{ success: boolean; message?: string; version?: string }> {
    try {
      const response = await fetch("/api/vcm/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: this.config.baseUrl,
          apiKey: this.config.apiKey,
          useMockData: this.useMockData,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      return {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      }
    }
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    try {
      const params = new URLSearchParams({
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        useMockData: this.useMockData.toString(),
      })

      const response = await fetch(`/api/vcm/credential-types?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "クレデンシャルタイプの取得に失敗しました")
      }

      return result.credentialTypes || []
    } catch (error) {
      console.error("Failed to fetch credential types:", error)
      throw new Error(
        `クレデンシャルタイプの取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  async registerIntegration(integration: {
    name: string
    url: string
    webhookSecret: string
    autoSync?: boolean
  }): Promise<VCMIntegration> {
    try {
      const response = await fetch("/api/vcm/register-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: this.config.baseUrl,
          apiKey: this.config.apiKey,
          useMockData: this.useMockData,
          integration,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "統合の登録に失敗しました")
      }

      return result.integration
    } catch (error) {
      console.error("Failed to register integration:", error)
      throw new Error(`統合の登録に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }

  async syncCredentialTypes(): Promise<{
    success: boolean
    synced: number
    errors: string[]
    lastSync: string
  }> {
    try {
      const credentialTypes = await this.getCredentialTypes()
      const syncResult = {
        success: true,
        synced: 0,
        errors: [] as string[],
        lastSync: new Date().toISOString(),
      }

      // Store credential types locally
      for (const vcmType of credentialTypes) {
        try {
          await this.saveLocalCredentialType(vcmType)
          syncResult.synced++
        } catch (error) {
          syncResult.errors.push(
            `Failed to sync ${vcmType.name}: ${error instanceof Error ? error.message : "不明なエラー"}`,
          )
        }
      }

      if (syncResult.errors.length > 0) {
        syncResult.success = false
      }

      return syncResult
    } catch (error) {
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "同期に失敗しました"],
        lastSync: new Date().toISOString(),
      }
    }
  }

  private async saveLocalCredentialType(vcmType: VCMCredentialType): Promise<void> {
    // Convert VCM credential type to local template format
    const template = this.convertVCMTypeToLocalTemplate(vcmType)

    // Save to local storage
    const existingTemplates = this.getLocalTemplates()
    const updatedTemplates = existingTemplates.filter((t) => t.id !== template.id)
    updatedTemplates.push(template)

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vcm_synced_templates", JSON.stringify(updatedTemplates))
      } catch (error) {
        console.error("Failed to save credential type to localStorage:", error)
      }
    }
  }

  private convertVCMTypeToLocalTemplate(vcmType: VCMCredentialType): any {
    const properties = vcmType.schema?.properties || {}
    const required = vcmType.schema?.required || []

    const claims = Object.entries(properties).map(([key, property]) => ({
      key,
      name: property.title || key,
      description: property.description || `${key} field`,
      type: this.mapSchemaTypeToClaimType(property.type, property.format),
      required: required.includes(key),
      selectiveDisclosure: property.selectiveDisclosure || false,
      defaultValue: property.default,
      enum: property.enum,
      pattern: property.pattern,
      minLength: property.minLength,
      maxLength: property.maxLength,
    }))

    return {
      id: vcmType.id,
      name: vcmType.display?.name || vcmType.name,
      description: vcmType.display?.description || vcmType.description,
      type: vcmType.issuanceConfig?.type || ["VerifiableCredential"],
      context: vcmType.issuanceConfig?.context || ["https://www.w3.org/2018/credentials/v1"],
      claims,
      display: {
        name: vcmType.display?.name || vcmType.name,
        locale: vcmType.display?.locale || "ja-JP",
        backgroundColor: vcmType.display?.backgroundColor || "#1e40af",
        textColor: vcmType.display?.textColor || "#ffffff",
        logo: vcmType.display?.logo,
      },
      validityPeriod: vcmType.issuanceConfig?.validityPeriod || 365,
      issuer: vcmType.issuanceConfig?.issuer || "https://university.example.com",
      version: vcmType.version || "1.0.0",
      status: vcmType.status || "active",
      source: "vcm" as const,
      vcmId: vcmType.id,
      lastSynced: new Date().toISOString(),
      syncStatus: "synced" as const,
    }
  }

  private mapSchemaTypeToClaimType(schemaType: string, format?: string): string {
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

  private getLocalTemplates(): any[] {
    if (typeof window === "undefined") {
      return []
    }

    try {
      const stored = localStorage.getItem("vcm_synced_templates")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}
