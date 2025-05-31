import { type NextRequest, NextResponse } from "next/server"

// デバッグ用のログ関数
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[VCM-API ${timestamp}] ${message}`)
  if (data) {
    console.log(`[VCM-API ${timestamp}] Data:`, JSON.stringify(data, null, 2))
  }
}

// VCMレスポンスの詳細ログ
function logVCMResponse(response: Response, responseText: string, parsedData?: any, parseError?: any) {
  console.log("=== VCM API Response Details ===")
  console.log(`Status: ${response.status} ${response.statusText}`)
  console.log(`URL: ${response.url}`)
  console.log("Headers:")
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`)
  })
  console.log(`Response Size: ${responseText.length} characters`)
  console.log("Raw Response Text:")
  console.log(responseText)

  if (parseError) {
    console.log("JSON Parse Error:")
    console.log(parseError)
  } else if (parsedData) {
    console.log("Parsed JSON Data:")
    console.log(JSON.stringify(parsedData, null, 2))

    // データ構造の分析
    console.log("Data Structure Analysis:")
    if (Array.isArray(parsedData)) {
      console.log(`- Root is array with ${parsedData.length} items`)
    } else if (typeof parsedData === "object" && parsedData !== null) {
      console.log(`- Root is object with keys: ${Object.keys(parsedData).join(", ")}`)

      // よくあるプロパティをチェック
      if (parsedData.credentialTypes) {
        console.log(
          `- credentialTypes: ${Array.isArray(parsedData.credentialTypes) ? `array with ${parsedData.credentialTypes.length} items` : typeof parsedData.credentialTypes}`,
        )
      }
      if (parsedData.data) {
        console.log(
          `- data: ${Array.isArray(parsedData.data) ? `array with ${parsedData.data.length} items` : typeof parsedData.data}`,
        )
      }
      if (parsedData.items) {
        console.log(
          `- items: ${Array.isArray(parsedData.items) ? `array with ${parsedData.items.length} items` : typeof parsedData.items}`,
        )
      }
      if (parsedData.success !== undefined) {
        console.log(`- success: ${parsedData.success}`)
      }
      if (parsedData.error) {
        console.log(`- error: ${parsedData.error}`)
      }
      if (parsedData.message) {
        console.log(`- message: ${parsedData.message}`)
      }
    }
  }
  console.log("================================")
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
      validityPeriod: 1460,
      issuer: "https://university.example.com",
      context: ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "StudentIDCredential"],
      revocable: true,
      batchIssuance: false,
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

      debugLog("Parameter validation failed", errorResponse)
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
      Accept: "application/json",
    }

    console.log("=== VCM Request Details ===")
    console.log(`Endpoint: ${vcmEndpoint}`)
    console.log(`Method: GET`)
    console.log("Headers:")
    Object.entries(requestHeaders).forEach(([key, value]) => {
      if (key.includes("Key") || key.includes("Authorization")) {
        console.log(`  ${key}: ${value.substring(0, 8)}...`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    console.log("===========================")

    const vcmRequestStart = Date.now()

    try {
      debugLog(`Making request to VCM: ${vcmEndpoint}`)

      const vcmResponse = await fetch(vcmEndpoint, {
        method: "GET",
        headers: requestHeaders,
        signal: AbortSignal.timeout(15000), // 15秒タイムアウト
      })

      const vcmResponseTime = Date.now() - vcmRequestStart

      // レスポンステキストを取得
      const responseText = await vcmResponse.text()

      // VCMレスポンスの詳細ログ
      let parsedData: any = null
      let parseError: any = null

      try {
        parsedData = JSON.parse(responseText)
      } catch (error) {
        parseError = error
      }

      // 詳細なレスポンスログを出力
      logVCMResponse(vcmResponse, responseText, parsedData, parseError)

      if (!vcmResponse.ok) {
        debugLog(`VCM API returned error status: ${vcmResponse.status}`)

        // エラーレスポンスでもフォールバック
        const fallbackResponse = {
          success: true,
          credentialTypes: MOCK_CREDENTIAL_TYPES,
          mode: "fallback-error",
          debugInfo: {
            source: "fallback-after-http-error",
            originalHttpStatus: vcmResponse.status,
            originalHttpStatusText: vcmResponse.statusText,
            originalResponseText: responseText,
            originalParsedData: parsedData,
            originalParseError: parseError?.message,
            attemptedEndpoint: vcmEndpoint,
            count: MOCK_CREDENTIAL_TYPES.length,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            vcmResponseTime,
            requestId: `req_${Date.now()}`,
          },
          errorDetails: {
            type: "VCM_HTTP_ERROR",
            httpStatus: vcmResponse.status,
            httpStatusText: vcmResponse.statusText,
            responseText: responseText,
            parsedData: parsedData,
            parseError: parseError?.message,
            connectionDetails: {
              endpoint: vcmEndpoint,
              method: "GET",
              headers: {
                ...requestHeaders,
                "X-API-Key": `${apiKey.substring(0, 8)}...`,
                Authorization: `Bearer ${apiKey.substring(0, 8)}...`,
              },
            },
            responseTime: vcmResponseTime,
          },
        }

        return NextResponse.json(fallbackResponse)
      }

      // パースエラーの場合
      if (parseError) {
        debugLog("Failed to parse VCM response as JSON")

        const fallbackResponse = {
          success: true,
          credentialTypes: MOCK_CREDENTIAL_TYPES,
          mode: "fallback-parse-error",
          debugInfo: {
            source: "fallback-after-parse-error",
            originalResponseText: responseText,
            parseError: parseError.message,
            attemptedEndpoint: vcmEndpoint,
            count: MOCK_CREDENTIAL_TYPES.length,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            vcmResponseTime,
            requestId: `req_${Date.now()}`,
          },
          errorDetails: {
            type: "VCM_PARSE_ERROR",
            responseText: responseText,
            parseError: parseError.message,
            responseSize: responseText.length,
          },
        }

        return NextResponse.json(fallbackResponse)
      }

      // VCM接続成功 - データ抽出
      let credentialTypes: any[] = []

      if (Array.isArray(parsedData)) {
        credentialTypes = parsedData
        debugLog("VCM response is a direct array")
      } else if (parsedData && typeof parsedData === "object") {
        if (parsedData.credentialTypes && Array.isArray(parsedData.credentialTypes)) {
          credentialTypes = parsedData.credentialTypes
          debugLog("Found credentialTypes array in response")
        } else if (parsedData.data && Array.isArray(parsedData.data)) {
          credentialTypes = parsedData.data
          debugLog("Found data array in response")
        } else if (parsedData.items && Array.isArray(parsedData.items)) {
          credentialTypes = parsedData.items
          debugLog("Found items array in response")
        } else {
          debugLog("No recognizable array found in VCM response, using empty array")
          credentialTypes = []
        }
      } else {
        debugLog("VCM response is not an object or array, using empty array")
        credentialTypes = []
      }

      debugLog(`Extracted ${credentialTypes.length} credential types from VCM response`)

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
          vcmResponseTime,
          requestId: `req_${Date.now()}`,
          vcmResponseDetails: {
            httpStatus: vcmResponse.status,
            httpStatusText: vcmResponse.statusText,
            responseSize: responseText.length,
            isArray: Array.isArray(parsedData),
            hasCredentialTypes: !!parsedData?.credentialTypes,
            hasData: !!parsedData?.data,
            hasItems: !!parsedData?.items,
            rootKeys: parsedData && typeof parsedData === "object" ? Object.keys(parsedData) : [],
            originalResponse: parsedData, // 完全なレスポンスデータ
          },
        },
      }

      return NextResponse.json(successResponse)
    } catch (fetchError) {
      const vcmResponseTime = Date.now() - vcmRequestStart

      console.log("=== VCM Connection Error ===")
      console.log(`Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
      console.log(`Error Type: ${fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError}`)
      if (fetchError instanceof Error && fetchError.stack) {
        console.log(`Stack: ${fetchError.stack}`)
      }
      console.log(`Endpoint: ${vcmEndpoint}`)
      console.log(`Response Time: ${vcmResponseTime}ms`)
      console.log("============================")

      // フォールバック: モックデータを返す
      const fallbackResponse = {
        success: true,
        credentialTypes: MOCK_CREDENTIAL_TYPES,
        mode: "fallback-connection-error",
        debugInfo: {
          source: "fallback-after-connection-error",
          originalError: fetchError instanceof Error ? fetchError.message : String(fetchError),
          errorType: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError,
          errorStack: fetchError instanceof Error ? fetchError.stack : undefined,
          attemptedEndpoint: vcmEndpoint,
          count: MOCK_CREDENTIAL_TYPES.length,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          vcmResponseTime,
          requestId: `req_${Date.now()}`,
        },
        errorDetails: {
          type: "VCM_CONNECTION_ERROR",
          errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
          errorType: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError,
          connectionDetails: {
            endpoint: vcmEndpoint,
            method: "GET",
            headers: {
              ...requestHeaders,
              "X-API-Key": `${apiKey.substring(0, 8)}...`,
              Authorization: `Bearer ${apiKey.substring(0, 8)}...`,
            },
          },
          responseTime: vcmResponseTime,
          troubleshooting: [
            "VCMサーバーが起動していることを確認してください",
            "ネットワーク接続を確認してください",
            "API Keyが正しいことを確認してください",
            "VCMサーバーのログを確認してください",
            "ファイアウォール設定を確認してください",
            "デモモードの使用を検討してください",
          ],
        },
      }

      return NextResponse.json(fallbackResponse)
    }
  } catch (error) {
    console.log("=== API Internal Error ===")
    console.log(`Error: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    if (error instanceof Error && error.stack) {
      console.log(`Stack: ${error.stack}`)
    }
    console.log("==========================")

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

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, apiKey, useMockData } = body

    debugLog("POST request received", {
      baseUrl,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : null,
      useMockData,
    })

    // GETと同じロジックを使用するため、URLパラメータに変換
    const url = new URL(request.url)
    url.searchParams.set("baseUrl", baseUrl)
    url.searchParams.set("apiKey", apiKey)
    url.searchParams.set("useMockData", useMockData?.toString() || "false")

    const getRequest = new Request(url.toString(), {
      method: "GET",
      headers: request.headers,
    })

    return GET(getRequest as NextRequest)
  } catch (error) {
    debugLog("POST request error", error)
    return NextResponse.json(
      {
        success: false,
        message: "クレデンシャルタイプの取得中にエラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
