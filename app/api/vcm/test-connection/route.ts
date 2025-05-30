import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, useMockData } = await request.json()

    if (useMockData) {
      // Return mock success for demo mode
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate delay
      return NextResponse.json({
        success: true,
        message: "デモモード: VCMとの接続が正常に確立されました",
        version: "demo-1.0.0",
        mode: "demo",
      })
    }

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Base URLとAPI Keyが必要です",
          troubleshooting: [
            "VCM Base URLを入力してください",
            "API Keyを入力してください",
            "または、デモモードを有効にしてください",
          ],
        },
        { status: 400 },
      )
    }

    console.log(`Testing VCM connection to: ${baseUrl}`)
    console.log(`API Key provided: ${apiKey ? "Yes" : "No"}`)

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch (urlError) {
      return NextResponse.json({
        success: false,
        message: "無効なURL形式です",
        troubleshooting: [
          "URLが正しい形式か確認してください (例: https://example.com)",
          "プロトコル (http:// または https://) が含まれているか確認してください",
        ],
      })
    }

    // Test basic connectivity first
    try {
      console.log(`Testing basic connectivity to: ${baseUrl}`)
      const basicResponse = await fetch(baseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 seconds for basic test
      })

      console.log(`Basic connectivity test - Status: ${basicResponse.status}`)

      if (basicResponse.status === 404) {
        return NextResponse.json({
          success: false,
          message: "VCMサーバーが見つかりません (404)",
          statusCode: 404,
          troubleshooting: [
            "URLが正しいか確認してください",
            "VCMサーバーが起動しているか確認してください",
            "ポート番号が正しいか確認してください",
            "ファイアウォールやプロキシの設定を確認してください",
            "デモモードを使用することをお勧めします",
          ],
          suggestedActions: ["デモモードに切り替える", "URLを再確認する", "VCMサーバーの管理者に連絡する"],
        })
      }
    } catch (basicError) {
      console.error("Basic connectivity test failed:", basicError)
      return NextResponse.json({
        success: false,
        message: `VCMサーバーに接続できません: ${basicError instanceof Error ? basicError.message : "不明なエラー"}`,
        error: basicError instanceof Error ? basicError.name : "NetworkError",
        troubleshooting: [
          "インターネット接続を確認してください",
          "VCMサーバーが起動しているか確認してください",
          "URLが正しいか確認してください",
          "ファイアウォールの設定を確認してください",
          "デモモードを使用することをお勧めします",
        ],
      })
    }

    // Try different health endpoints and methods
    const healthEndpoints = [
      { path: "/health", method: "GET" },
      { path: "/api/health", method: "GET" },
      { path: "/health", method: "POST" },
      { path: "/api/health", method: "POST" },
      { path: "/api/v1/health", method: "GET" },
      { path: "/status", method: "GET" },
    ]

    let healthData: any = null
    let successfulHealthEndpoint: string | null = null

    for (const endpoint of healthEndpoints) {
      try {
        const healthEndpoint = `${baseUrl}${endpoint.path}`
        console.log(`Trying health endpoint: ${endpoint.method} ${healthEndpoint}`)

        const healthResponse = await fetch(healthEndpoint, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Student-Login-Site/1.0",
            ...(endpoint.method === "POST" && {
              "X-API-Key": apiKey,
              Authorization: `Bearer ${apiKey}`,
            }),
          },
          ...(endpoint.method === "POST" && {
            body: JSON.stringify({
              source: "student-login-site",
              timestamp: new Date().toISOString(),
            }),
          }),
          signal: AbortSignal.timeout(8000), // 8 seconds
        })

        console.log(`Health endpoint ${endpoint.method} ${healthEndpoint} response status: ${healthResponse.status}`)

        if (healthResponse.ok) {
          try {
            healthData = await healthResponse.json()
            successfulHealthEndpoint = `${endpoint.method} ${healthEndpoint}`
            console.log("Health endpoint data:", healthData)
            break
          } catch (jsonError) {
            // If JSON parsing fails, try next endpoint
            console.log(`JSON parsing failed for ${healthEndpoint}, trying next endpoint`)
            continue
          }
        } else if (healthResponse.status === 404) {
          console.log(`404 for ${healthEndpoint}, trying next endpoint`)
          continue
        } else {
          console.log(`Non-200 status ${healthResponse.status} for ${healthEndpoint}, trying next endpoint`)
          continue
        }
      } catch (endpointError) {
        console.log(`Error testing ${endpoint.method} ${endpoint.path}:`, endpointError)
        continue
      }
    }

    if (!healthData || !successfulHealthEndpoint) {
      return NextResponse.json({
        success: false,
        message: "VCMのヘルスエンドポイントが見つかりません",
        statusCode: 404,
        troubleshooting: [
          "VCMサーバーが正しく起動しているか確認してください",
          "以下のエンドポイントが利用可能か確認してください:",
          "  - GET /health",
          "  - GET /api/health",
          "  - POST /api/health",
          "  - GET /api/v1/health",
          "  - GET /status",
          "VCMサーバーのドキュメントでAPIエンドポイントを確認してください",
          "デモモードを使用することをお勧めします",
        ],
        testedEndpoints: healthEndpoints.map((e) => `${e.method} ${e.path}`),
      })
    }

    // Test authentication with integrations endpoints
    const integrationEndpoints = [
      { path: "/api/integrations", method: "GET" },
      { path: "/api/integrations/test", method: "POST" },
      { path: "/api/v1/integrations", method: "GET" },
      { path: "/integrations", method: "GET" },
      { path: "/integrations/test", method: "POST" },
    ]

    let authSuccess = false
    let authEndpoint: string | null = null

    for (const endpoint of integrationEndpoints) {
      try {
        const testEndpoint = `${baseUrl}${endpoint.path}`
        console.log(`Testing auth endpoint: ${endpoint.method} ${testEndpoint}`)

        const authResponse = await fetch(testEndpoint, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "Student-Login-Site/1.0",
          },
          ...(endpoint.method === "POST" && {
            body: JSON.stringify({
              source: "student-login-site",
              timestamp: new Date().toISOString(),
            }),
          }),
          signal: AbortSignal.timeout(8000),
        })

        console.log(`Auth endpoint ${endpoint.method} ${testEndpoint} response status: ${authResponse.status}`)

        if (authResponse.ok) {
          authSuccess = true
          authEndpoint = `${endpoint.method} ${testEndpoint}`
          break
        } else if (authResponse.status === 401 || authResponse.status === 403) {
          // Authentication endpoint exists but credentials are invalid
          let errorMessage = `認証エラー (${authResponse.status}): 無効なAPI Key`
          try {
            const errorData = await authResponse.json()
            errorMessage = `認証エラー (${authResponse.status}): ${errorData.message || "無効なAPI Key"}`
          } catch (e) {
            // If we can't parse JSON, use default message
          }

          return NextResponse.json({
            success: false,
            message: errorMessage,
            statusCode: authResponse.status,
            endpoint: testEndpoint,
            troubleshooting: [
              "API Keyが正しいか確認してください",
              "VCMサーバーでAPI Keyが有効になっているか確認してください",
              "API Keyの権限が適切に設定されているか確認してください",
            ],
          })
        }
      } catch (authError) {
        console.log(`Error testing auth endpoint ${endpoint.method} ${endpoint.path}:`, authError)
        continue
      }
    }

    if (authSuccess && authEndpoint) {
      return NextResponse.json({
        success: true,
        message: "VCMとの接続が正常に確立されました",
        version: healthData.version || "unknown",
        mode: "production",
        healthEndpoint: successfulHealthEndpoint,
        authEndpoint: authEndpoint,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "VCMの統合エンドポイントが見つかりません",
        statusCode: 404,
        troubleshooting: [
          "VCMサーバーの統合機能が有効になっているか確認してください",
          "以下のエンドポイントが利用可能か確認してください:",
          "  - GET /api/integrations",
          "  - POST /api/integrations/test",
          "  - GET /api/v1/integrations",
          "API Keyが正しく設定されているか確認してください",
          "VCMサーバーのバージョンが最新か確認してください",
        ],
        testedEndpoints: integrationEndpoints.map((e) => `${e.method} ${e.path}`),
        healthEndpoint: successfulHealthEndpoint,
      })
    }
  } catch (error) {
    console.error("VCM connection test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        error: error instanceof Error ? error.name : "UnknownError",
        troubleshooting: [
          "リクエストの形式を確認してください",
          "サーバーのログを確認してください",
          "デモモードを使用することをお勧めします",
        ],
      },
      { status: 500 },
    )
  }
}
