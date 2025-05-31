import { type NextRequest, NextResponse } from "next/server"

// デバッグ用のログ関数
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[VCM-API ${timestamp}] ${message}`)
  if (data) {
    console.log(`[VCM-API ${timestamp}] Data:`, JSON.stringify(data, null, 2))
  }
}

// リクエスト詳細を記録する関数
function logRequestDetails(request: NextRequest, params: URLSearchParams) {
  debugLog("=== VCM Credential Types API Request ===")
  debugLog(`Method: ${request.method}`)
  debugLog(`URL: ${request.url}`)
  debugLog(`Headers:`, Object.fromEntries(request.headers.entries()))
  debugLog(`Query Parameters:`, Object.fromEntries(params.entries()))
  debugLog("==========================================")
}

// レスポンス詳細を記録する関数
function logResponseDetails(status: number, data: any, error?: any) {
  debugLog("=== VCM Credential Types API Response ===")
  debugLog(`Status: ${status}`)
  debugLog(`Response Data:`, data)
  if (error) {
    debugLog(`Error:`, error)
  }
  debugLog("==========================================")
}

// モックデータ
const MOCK_CREDENTIAL_TYPES = [
  {
    id: "student-id-card",
    name: "学生証",
    description: "大学の学生証明書",
    version: "1.0.0",
    status: "active",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
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
          selectiveDisclosure: true,
        },
        department: {
          type: "string",
          title: "学部",
          description: "所属学部",
          selectiveDisclosure: true,
        },
        enrollmentYear: {
          type: "integer",
          title: "入学年度",
          description: "入学した年度",
          selectiveDisclosure: true,
        },
        graduationYear: {
          type: "integer",
          title: "卒業予定年度",
          description: "卒業予定の年度",
          selectiveDisclosure: true,
        },
      },
      required: ["studentId", "fullName", "department"],
      additionalProperties: false,
    },
    display: {
      name: "学生証",
      description: "大学の学生証明書",
      locale: "ja-JP",
      backgroundColor: "#1e40af",
      textColor: "#ffffff",
    },
    issuanceConfig: {
      validityPeriod: 1460, // 4年
      issuer: "https://university.example.com",
      context: ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "StudentIDCredential"],
      revocable: true,
      batchIssuance: false,
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "academic-transcript",
    name: "成績証明書",
    description: "学業成績の証明書",
    version: "1.0.0",
    status: "active",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
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
          selectiveDisclosure: true,
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
          description: "取得した総単位数",
          selectiveDisclosure: true,
        },
        courses: {
          type: "array",
          title: "履修科目",
          description: "履修した科目一覧",
          selectiveDisclosure: true,
        },
      },
      required: ["studentId", "fullName"],
      additionalProperties: false,
    },
    display: {
      name: "成績証明書",
      description: "学業成績の証明書",
      locale: "ja-JP",
      backgroundColor: "#059669",
      textColor: "#ffffff",
    },
    issuanceConfig: {
      validityPeriod: 365,
      issuer: "https://university.example.com",
      context: ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "AcademicTranscriptCredential"],
      revocable: false,
      batchIssuance: true,
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // リクエスト詳細をログ出力
    logRequestDetails(request, searchParams)

    const baseUrl = searchParams.get("baseUrl")
    const apiKey = searchParams.get("apiKey")
    const useMockData = searchParams.get("useMockData") === "true"

    debugLog("Parsed parameters:", {
      baseUrl,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : null,
      useMockData,
    })

    // パラメータ検証
    if (!useMockData && (!baseUrl || !apiKey)) {
      const errorResponse = {
        success: false,
        error: "Missing required parameters",
        message: "baseUrl and apiKey are required when not using mock data",
        debugInfo: {
          receivedParams: {
            baseUrl: !!baseUrl,
            apiKey: !!apiKey,
            useMockData,
          },
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      }

      logResponseDetails(400, errorResponse)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // モックデータモード
    if (useMockData) {
      debugLog("Using mock data mode")

      const mockResponse = {
        success: true,
        credentialTypes: MOCK_CREDENTIAL_TYPES,
        mode: "mock",
        debugInfo: {
          source: "mock-data",
          count: MOCK_CREDENTIAL_TYPES.length,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          requestId: `req_${Date.now()}`,
        },
      }

      logResponseDetails(200, mockResponse)
      return NextResponse.json(mockResponse)
    }

    // 実際のVCM接続モード
    debugLog("Attempting real VCM connection")

    const vcmEndpoint = `${baseUrl}/api/credential-types`
    const requestHeaders = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "Student-Login-Site/1.0",
    }

    debugLog("VCM Request Details:", {
      endpoint: vcmEndpoint,
      headers: {
        ...requestHeaders,
        "X-API-Key": `${apiKey.substring(0, 8)}...`,
        Authorization: `Bearer ${apiKey.substring(0, 8)}...`,
      },
      method: "GET",
    })

    const vcmRequestStart = Date.now()

    let vcmResponse: Response
    let vcmData: any
    let connectionError: any = null

    try {
      debugLog(`Making request to VCM: ${vcmEndpoint}`)

      vcmResponse = await fetch(vcmEndpoint, {
        method: "GET",
        headers: requestHeaders,
        signal: AbortSignal.timeout(10000), // 10秒タイムアウト
      })

      const vcmResponseTime = Date.now() - vcmRequestStart

      debugLog("VCM Response received:", {
        status: vcmResponse.status,
        statusText: vcmResponse.statusText,
        headers: Object.fromEntries(vcmResponse.headers.entries()),
        responseTime: vcmResponseTime,
      })

      if (!vcmResponse.ok) {
        const errorText = await vcmResponse.text()
        debugLog("VCM Response Error Text:", errorText)

        throw new Error(`VCM API returned ${vcmResponse.status}: ${vcmResponse.statusText}. Response: ${errorText}`)
      }

      vcmData = await vcmResponse.json()
      debugLog("VCM Response Data:", vcmData)
    } catch (fetchError) {
      connectionError = fetchError
      debugLog("VCM Connection Error:", {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        endpoint: vcmEndpoint,
        responseTime: Date.now() - vcmRequestStart,
      })

      // フォールバック: モックデータを返す
      debugLog("Falling back to mock data due to VCM connection error")

      const fallbackResponse = {
        success: true,
        credentialTypes: MOCK_CREDENTIAL_TYPES,
        mode: "fallback-mock",
        debugInfo: {
          source: "fallback-after-error",
          originalError: fetchError instanceof Error ? fetchError.message : String(fetchError),
          attemptedEndpoint: vcmEndpoint,
          count: MOCK_CREDENTIAL_TYPES.length,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          requestId: `req_${Date.now()}`,
        },
        errorDetails: {
          type: "VCM_CONNECTION_ERROR",
          httpStatus: vcmResponse?.status,
          errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
          connectionDetails: {
            endpoint: vcmEndpoint,
            method: "GET",
            headers: {
              ...requestHeaders,
              "X-API-Key": `${apiKey.substring(0, 8)}...`,
              Authorization: `Bearer ${apiKey.substring(0, 8)}...`,
            },
          },
          responseTime: Date.now() - vcmRequestStart,
          troubleshooting: [
            "VCMサーバーが起動していることを確認してください",
            "ネットワーク接続を確認してください",
            "API Keyが正しいことを確認してください",
            "VCMサーバーのログを確認してください",
            "デモモードの使用を検討してください",
          ],
        },
      }

      logResponseDetails(200, fallbackResponse, connectionError)
      return NextResponse.json(fallbackResponse)
    }

    // VCM接続成功
    let credentialTypes: any[] = []

    if (Array.isArray(vcmData)) {
      credentialTypes = vcmData
    } else if (vcmData.credentialTypes && Array.isArray(vcmData.credentialTypes)) {
      credentialTypes = vcmData.credentialTypes
    } else if (vcmData.data && Array.isArray(vcmData.data)) {
      credentialTypes = vcmData.data
    } else if (vcmData.items && Array.isArray(vcmData.items)) {
      credentialTypes = vcmData.items
    } else {
      debugLog("Unexpected VCM response format, using empty array:", vcmData)
      credentialTypes = []
    }

    const successResponse = {
      success: true,
      credentialTypes,
      mode: "vcm",
      debugInfo: {
        source: "vcm-server",
        endpoint: vcmEndpoint,
        count: credentialTypes.length,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        vcmResponseTime: Date.now() - vcmRequestStart,
        requestId: `req_${Date.now()}`,
        vcmResponseFormat: {
          isArray: Array.isArray(vcmData),
          hasCredentialTypes: !!vcmData.credentialTypes,
          hasData: !!vcmData.data,
          hasItems: !!vcmData.items,
          keys: Object.keys(vcmData),
        },
      },
    }

    logResponseDetails(200, successResponse)
    return NextResponse.json(successResponse)
  } catch (error) {
    const errorResponse = {
      success: false,
      error: "Failed to fetch credential types",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      debugInfo: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        requestId: `req_${Date.now()}`,
      },
    }

    logResponseDetails(500, errorResponse, error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
