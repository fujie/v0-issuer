// Updated VCM Client based on actual VCM repository structure
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

export interface VCMWebhookEvent {
  id: string
  type: "credential_type_created" | "credential_type_updated" | "credential_type_deleted" | "credential_issued"
  data: any
  timestamp: string
  integrationId: string
}

export class VCMClient {
  private config: VCMConfig

  constructor(config: VCMConfig) {
    this.config = config
  }

  async testConnection(): Promise<{ success: boolean; message?: string; version?: string }> {
    try {
      // Test the health endpoint first
      const healthResponse = await fetch(`${this.config.baseUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()

        // Test authentication with the integrations endpoint
        const authResponse = await fetch(`${this.config.baseUrl}/api/integrations/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            source: "student-login-site",
            timestamp: new Date().toISOString(),
          }),
        })

        if (authResponse.ok) {
          return {
            success: true,
            message: "VCMとの接続が正常に確立されました",
            version: healthData.version || "unknown",
          }
        } else {
          const errorData = await authResponse.json().catch(() => ({}))
          return {
            success: false,
            message: `認証エラー: ${errorData.message || authResponse.statusText}`,
          }
        }
      } else {
        return {
          success: false,
          message: `VCMサーバーに接続できません: ${healthResponse.statusText}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `接続エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
      }
    }
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/credential-types`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle different response formats from VCM
      if (Array.isArray(data)) {
        return data
      } else if (data.credentialTypes && Array.isArray(data.credentialTypes)) {
        return data.credentialTypes
      } else if (data.data && Array.isArray(data.data)) {
        return data.data
      } else if (data.items && Array.isArray(data.items)) {
        return data.items
      } else {
        console.warn("Unexpected response format:", data)
        return []
      }
    } catch (error) {
      console.error("Failed to fetch credential types:", error)
      throw new Error(
        `クレデンシャルタイプの取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  async getCredentialType(typeId: string): Promise<VCMCredentialType | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/credential-types/${typeId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.credentialType || data.data || data
    } catch (error) {
      console.error(`Failed to fetch credential type ${typeId}:`, error)
      throw new Error(
        `クレデンシャルタイプ ${typeId} の取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  async createCredentialType(credentialType: Partial<VCMCredentialType>): Promise<VCMCredentialType> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/credential-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(credentialType),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return data.credentialType || data.data || data
    } catch (error) {
      console.error("Failed to create credential type:", error)
      throw new Error(
        `クレデンシャルタイプの作成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  async updateCredentialType(typeId: string, updates: Partial<VCMCredentialType>): Promise<VCMCredentialType> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/credential-types/${typeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return data.credentialType || data.data || data
    } catch (error) {
      console.error(`Failed to update credential type ${typeId}:`, error)
      throw new Error(
        `クレデンシャルタイプ ${typeId} の更新に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  async deleteCredentialType(typeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/credential-types/${typeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error(`Failed to delete credential type ${typeId}:`, error)
      throw new Error(
        `クレデンシャルタイプ ${typeId} の削除に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      )
    }
  }

  // Integration management methods
  async registerIntegration(integration: {
    name: string
    url: string
    webhookSecret: string
    autoSync?: boolean
  }): Promise<VCMIntegration> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          ...integration,
          apiKey: this.config.apiKey,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return data.integration || data.data || data
    } catch (error) {
      console.error("Failed to register integration:", error)
      throw new Error(`統合の登録に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }

  async getIntegrationStatus(): Promise<VCMIntegration | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/integrations/current`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.integration || data.data || data
    } catch (error) {
      console.error("Failed to get integration status:", error)
      return null
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

    // Save to local storage (in production, this would be saved to a database)
    const existingTemplates = this.getLocalTemplates()
    const updatedTemplates = existingTemplates.filter((t) => t.id !== template.id)
    updatedTemplates.push(template)

    if (typeof window !== "undefined") {
      localStorage.setItem("vcm_synced_templates", JSON.stringify(updatedTemplates))
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

  // Webhook handling methods
  async validateWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      // Implement webhook signature validation
      // This would typically use HMAC-SHA256
      const crypto = await import("crypto")
      const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

      return `sha256=${expectedSignature}` === signature
    } catch (error) {
      console.error("Webhook validation failed:", error)
      return false
    }
  }

  async handleWebhookEvent(event: VCMWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case "credential_type_created":
        case "credential_type_updated":
          // Re-sync the specific credential type
          const credentialType = await this.getCredentialType(event.data.id)
          if (credentialType) {
            await this.saveLocalCredentialType(credentialType)
          }
          break

        case "credential_type_deleted":
          // Remove from local storage
          this.removeLocalCredentialType(event.data.id)
          break

        case "credential_issued":
          // Handle credential issuance notification
          console.log("Credential issued:", event.data)
          break

        default:
          console.warn("Unknown webhook event type:", event.type)
      }
    } catch (error) {
      console.error("Failed to handle webhook event:", error)
      throw error
    }
  }

  private removeLocalCredentialType(typeId: string): void {
    if (typeof window === "undefined") {
      return
    }

    try {
      const existingTemplates = this.getLocalTemplates()
      const updatedTemplates = existingTemplates.filter((t) => t.vcmId !== typeId)
      localStorage.setItem("vcm_synced_templates", JSON.stringify(updatedTemplates))
    } catch (error) {
      console.error("Failed to remove local credential type:", error)
    }
  }
}

// Export the updated client
export { VCMClient as UpdatedVCMClient }
