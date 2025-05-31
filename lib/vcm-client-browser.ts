// 完全にブラウザ専用のVCMクライアント - サーバーサイドでは使用しない

export interface VCMConfig {
  baseUrl: string
  apiKey: string
  organizationId?: string
  useMockData?: boolean
  enabled?: boolean
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

// レスポンスの内容タイプを判定する関数
function isHTMLResponse(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<html>") ||
    trimmed.includes("</html>")
  )
}

// レスポンスの詳細を解析する関数
function analyzeResponse(response: Response, text: string) {
  const contentType = response.headers.get("content-type") || ""
  const isHTML = isHTMLResponse(text)
  const isJSON = contentType.includes("application/json")

  return {
    status: response.status,
    statusText: response.statusText,
    contentType,
    isHTML,
    isJSON,
    textLength: text.length,
    textPreview: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
  }
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
    this.useMockData = useMockData || config.useMockData || false
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
    responseDetails?: any
  }> {
    try {
      console.log(`Testing VCM connection to ${this.config.baseUrl} (Mock: ${this.useMockData})`)

      if (this.useMockData) {
        return {
          success: true,
          message: "デモモード: 接続テスト成功",
          mode: "mock",
          version: "1.0.0-mock",
        }
      }

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
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`)
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
          "VCMサーバーが起動していることを確認してください",
          "ネットワーク接続を確認してください",
          "API URLが正しいことを確認してください",
          "API Keyが正しいことを確認してください",
          "ブラウザのコンソールでエラーの詳細を確認してください",
          "デモモードを使用することをお勧めします",
        ],
        suggestedActions: ["デモモードに切り替える", "ページを再読み込みする", "VCMサーバーのログを確認する"],
      }
    }
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    try {
      console.log(`Getting credential types from ${this.config.baseUrl} (Mock: ${this.useMockData})`)

      if (this.useMockData) {
        console.log("Using mock data for credential types")
        return this.getMockCredentialTypes()
      }

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

      const responseText = await response.text()
      const responseAnalysis = analyzeResponse(response, responseText)

      console.log("VCM API Response Analysis:", responseAnalysis)

      if (!response.ok) {
        console.error("API response error:", response.status, responseAnalysis)

        // HTMLレスポンスの場合の特別な処理
        if (responseAnalysis.isHTML) {
          console.warn("VCM API returned HTML instead of JSON - likely a server error page")
          throw new Error(
            `VCM APIがHTMLページを返しました (ステータス: ${response.status}). ` +
              `エンドポイントが存在しないか、サーバーエラーが発生している可能性があります。` +
              `フォールバックデータを使用します。`,
          )
        }

        throw new Error(`HTTP ${response.status}: ${responseText}`)
      }

      // HTMLレスポンスをチェック（200ステータスでもHTMLが返される場合がある）
      if (responseAnalysis.isHTML) {
        console.warn("VCM API returned HTML with 200 status - likely a routing issue")
        throw new Error(
          `VCM APIが正常ステータス(200)でHTMLページを返しました. ` +
            `APIエンドポイントのルーティングに問題がある可能性があります。` +
            `フォールバックデータを使用します。`,
        )
      }

      let result: any
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        console.error("Response text:", responseText.substring(0, 500))
        throw new Error(
          `VCM APIのレスポンスをJSONとして解析できませんでした. ` +
            `レスポンス: ${responseText.substring(0, 100)}...` +
            `フォールバックデータを使用します。`,
        )
      }

      console.log("Get credential types result:", result)

      if (!result.success) {
        throw new Error(result.message || "クレデンシャルタイプの取得に失敗しました")
      }

      return result.credentialTypes || []
    } catch (error) {
      console.error("Failed to fetch credential types:", error)

      // エラーが発生した場合はフォールバックデータを返す
      console.log("Falling back to mock data due to error")
      return this.getMockCredentialTypes()
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

      if (this.useMockData) {
        // モックデータを返す
        return {
          id: `mock-integration-${Date.now()}`,
          name: integration.name,
          url: integration.url,
          apiKey: this.config.apiKey,
          webhookSecret: integration.webhookSecret,
          status: "active",
          autoSync: integration.autoSync || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

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

      const responseText = await response.text()
      const responseAnalysis = analyzeResponse(response, responseText)

      console.log("Register Integration Response Analysis:", responseAnalysis)

      if (!response.ok) {
        if (responseAnalysis.isHTML) {
          throw new Error(`統合登録APIがHTMLページを返しました (ステータス: ${response.status})`)
        }
        throw new Error(`HTTP ${response.status}: ${responseText}`)
      }

      if (responseAnalysis.isHTML) {
        throw new Error("統合登録APIが正常ステータスでHTMLページを返しました")
      }

      let result: any
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`統合登録APIのレスポンスをJSONとして解析できませんでした: ${responseText.substring(0, 100)}...`)
      }

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

  // モックデータを提供するメソッド
  private getMockCredentialTypes(): VCMCredentialType[] {
    console.log("Generating mock credential types")
    return [
      {
        id: "university-student-id-vcm",
        name: "大学学生証（VCM）",
        description: "VCMから同期された大学学生証テンプレート",
        version: "1.0.0",
        schema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            studentId: {
              type: "string",
              title: "学籍番号",
              description: "学生の学籍番号",
              selectiveDisclosure: false, // 必須項目として常に表示
            },
            fullName: {
              type: "string",
              title: "氏名",
              description: "学生の氏名",
              selectiveDisclosure: true, // 選択的開示
            },
            faculty: {
              type: "string",
              title: "学部",
              description: "所属学部",
              selectiveDisclosure: true, // 選択的開示
            },
            department: {
              type: "string",
              title: "学科",
              description: "所属学科",
              selectiveDisclosure: true, // 選択的開示
            },
            enrollmentYear: {
              type: "integer",
              title: "入学年度",
              description: "入学した年度",
              selectiveDisclosure: true, // 選択的開示
            },
            studentStatus: {
              type: "string",
              title: "在籍状況",
              description: "現在の在籍状況",
              enum: ["enrolled", "graduated", "suspended"],
              selectiveDisclosure: true, // 選択的開示
            },
            email: {
              type: "string",
              format: "email",
              title: "メールアドレス",
              description: "大学メールアドレス",
              selectiveDisclosure: true, // 選択的開示
            },
          },
          required: ["studentId", "fullName"],
          additionalProperties: false,
        },
        display: {
          name: "大学学生証（VCM）",
          description: "VCMから同期された大学学生証",
          backgroundColor: "#2563eb",
          textColor: "#ffffff",
          locale: "ja-JP",
        },
        issuanceConfig: {
          type: ["VerifiableCredential", "UniversityStudentCredential"],
          context: ["https://www.w3.org/2018/credentials/v1"],
          validityPeriod: 1095, // 3年
          issuer: "https://university.example.com",
        },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        status: "active",
      },
      {
        id: "academic-transcript-vcm",
        name: "成績証明書（VCM）",
        description: "VCMから同期された成績証明書テンプレート",
        version: "1.0.0",
        schema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            studentId: {
              type: "string",
              title: "学籍番号",
              description: "学生の学籍番号",
              selectiveDisclosure: false,
            },
            fullName: {
              type: "string",
              title: "氏名",
              description: "学生の氏名",
              selectiveDisclosure: false,
            },
            gpa: {
              type: "number",
              title: "GPA",
              description: "累積GPA",
              selectiveDisclosure: true,
            },
            totalCredits: {
              type: "integer",
              title: "取得単位数",
              description: "総取得単位数",
              selectiveDisclosure: true,
            },
            academicYear: {
              type: "string",
              title: "学年",
              description: "現在の学年",
              selectiveDisclosure: true,
            },
            major: {
              type: "string",
              title: "専攻",
              description: "専攻分野",
              selectiveDisclosure: true,
            },
            graduationDate: {
              type: "string",
              format: "date",
              title: "卒業予定日",
              description: "卒業予定日",
              selectiveDisclosure: true,
            },
          },
          required: ["studentId", "fullName"],
          additionalProperties: false,
        },
        display: {
          name: "成績証明書（VCM）",
          description: "VCMから同期された成績証明書",
          backgroundColor: "#059669",
          textColor: "#ffffff",
          locale: "ja-JP",
        },
        issuanceConfig: {
          type: ["VerifiableCredential", "AcademicTranscript"],
          context: ["https://www.w3.org/2018/credentials/v1"],
          validityPeriod: 365,
          issuer: "https://university.example.com",
        },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        status: "active",
      },
      {
        id: "graduation-certificate-vcm",
        name: "卒業証明書（VCM）",
        description: "VCMから同期された卒業証明書テンプレート",
        version: "1.0.0",
        schema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            studentId: {
              type: "string",
              title: "学籍番号",
              description: "学生の学籍番号",
              selectiveDisclosure: false,
            },
            fullName: {
              type: "string",
              title: "氏名",
              description: "学生の氏名",
              selectiveDisclosure: false,
            },
            degree: {
              type: "string",
              title: "学位",
              description: "取得学位",
              selectiveDisclosure: true,
            },
            major: {
              type: "string",
              title: "専攻",
              description: "専攻分野",
              selectiveDisclosure: true,
            },
            graduationDate: {
              type: "string",
              format: "date",
              title: "卒業日",
              description: "卒業日",
              selectiveDisclosure: true,
            },
            honors: {
              type: "string",
              title: "優等",
              description: "優等卒業の場合の表記",
              selectiveDisclosure: true,
            },
          },
          required: ["studentId", "fullName", "degree", "graduationDate"],
          additionalProperties: false,
        },
        display: {
          name: "卒業証明書（VCM）",
          description: "VCMから同期された卒業証明書",
          backgroundColor: "#7c3aed",
          textColor: "#ffffff",
          locale: "ja-JP",
        },
        issuanceConfig: {
          type: ["VerifiableCredential", "GraduationCertificate"],
          context: ["https://www.w3.org/2018/credentials/v1"],
          validityPeriod: 3650, // 10年
          issuer: "https://university.example.com",
        },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        status: "active",
      },
    ]
  }
}
