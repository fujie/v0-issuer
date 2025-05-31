// 完全にブラウザ専用のVCMクライアント - サーバーサイドでは使用しない

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
  schema: any
  display: any
  issuanceConfig: any
  createdAt: string
  updatedAt: string
  status: "active" | "draft" | "deprecated"
  organizationId?: string
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
    // ブラウザ環境でのみ動作することを確認
    if (typeof window === "undefined") {
      throw new Error("VCMBrowserClient can only be used in browser environment")
    }

    this.config = config
    this.useMockData = useMockData
  }

  async testConnection(): Promise<{
    success: boolean
    message?: string
    version?: string
    statusCode?: number
    error?: string
    endpoint?: string
    troubleshooting?: string[]
    suggestedActions?: string[]
    mode?: string
  }> {
    try {
      console.log(`Testing VCM connection to ${this.config.baseUrl} (Mock: ${this.useMockData})`)

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Test connection result:", result)

      return result
    } catch (error) {
      console.error("Connection test error:", error)
      return {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        error: error instanceof Error ? error.name : "UnknownError",
        troubleshooting: [
          "ネットワーク接続を確認してください",
          "ブラウザのコンソールでエラーの詳細を確認してください",
          "デモモードを使用することをお勧めします",
        ],
        suggestedActions: ["デモモードに切り替える", "ページを再読み込みする"],
      }
    }
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    try {
      console.log(`Getting credential types from ${this.config.baseUrl} (Mock: ${this.useMockData})`)

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

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API response error:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("Get credential types result:", result)

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
      console.log(`Registering integration with ${this.config.baseUrl} (Mock: ${this.useMockData})`)

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

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("Register integration result:", result)

      if (!result.success) {
        throw new Error(result.message || "統合の登録に失敗しました")
      }

      return result.integration
    } catch (error) {
      console.error("Failed to register integration:", error)
      throw new Error(`統合の登録に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }
}
