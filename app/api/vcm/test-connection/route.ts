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

    // Test the health endpoint
    try {
      const healthEndpoint = `${baseUrl}/api/health`
      console.log(`Checking health endpoint: ${healthEndpoint}`)

      const healthResponse = await fetch(healthEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Student-Login-Site/1.0",
        },
        signal: AbortSignal.timeout(10000), // 10 seconds
      })

      console.log(`Health endpoint response status: ${healthResponse.status}`)

      if (healthResponse.status === 404) {
        return NextResponse.json({
          success: false,
          message: "VCMのヘルスエンドポイントが見つかりません (/api/health)",
          statusCode: 404,
          endpoint: healthEndpoint,
          troubleshooting: [
            "VCMサーバーのAPIエンドポイントが正しく設定されているか確認してください",
            "VCMサーバーのバージョンが最新か確認してください",
            "/api/health エンドポイントが実装されているか確認してください",
            "デモモードを使用することをお勧めします",
          ],
        })
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        console.log("Health endpoint data:", healthData)

        // Test authentication with the integrations endpoint
        try {
          const testEndpoint = `${baseUrl}/api/integrations/test`
          console.log(`Testing auth endpoint: ${testEndpoint}`)

          const authResponse = await fetch(testEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
              Authorization: `Bearer ${apiKey}`,
              "User-Agent": "Student-Login-Site/1.0",
            },
            body: JSON.stringify({
              source: "student-login-site",
              timestamp: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(10000),
          })

          console.log(`Auth endpoint response status: ${authResponse.status}`)

          if (authResponse.status === 404) {
            return NextResponse.json({
              success: false,
              message: "VCMの統合テストエンドポイントが見つかりません (/api/integrations/test)",
              statusCode: 404,
              endpoint: testEndpoint,
              troubleshooting: [
                "VCMサーバーの統合機能が有効になっているか確認してください",
                "/api/integrations/test エンドポイントが実装されているか確認してください",
                "VCMサーバーのバージョンが最新か確認してください",
              ],
            })
          }

          if (authResponse.ok) {
            return NextResponse.json({
              success: true,
              message: "VCMとの接続が正常に確立されました",
              version: healthData.version || "unknown",
              mode: "production",
            })
          } else {
            let errorMessage = `認証エラー (${authResponse.status}): ${authResponse.statusText}`
            const troubleshooting = [
              "API Keyが正しいか確認してください",
              "VCMサーバーでAPI Keyが有効になっているか確認してください",
            ]

            try {
              const errorData = await authResponse.json()
              errorMessage = `認証エラー (${authResponse.status}): ${errorData.message || authResponse.statusText}`
              if (errorData.details) {
                troubleshooting.push(`詳細: ${errorData.details}`)
              }
            } catch (e) {
              // If we can't parse JSON, just use the status text
            }

            return NextResponse.json({
              success: false,
              message: errorMessage,
              statusCode: authResponse.status,
              troubleshooting,
            })
          }
        } catch (authError) {
          console.error("Auth endpoint error:", authError)
          return NextResponse.json({
            success: false,
            message: `認証テストでエラーが発生しました: ${authError instanceof Error ? authError.message : "不明なエラー"}`,
            error: authError instanceof Error ? authError.name : "UnknownError",
            troubleshooting: [
              "ネットワーク接続を確認してください",
              "VCMサーバーが正常に動作しているか確認してください",
              "API Keyが正しいか確認してください",
            ],
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          message: `VCMサーバーのヘルスチェックに失敗しました (${healthResponse.status}): ${healthResponse.statusText}`,
          statusCode: healthResponse.status,
          endpoint: healthEndpoint,
          troubleshooting: [
            "VCMサーバーが正常に起動しているか確認してください",
            "サーバーのログを確認してください",
            "必要な依存関係がインストールされているか確認してください",
          ],
        })
      }
    } catch (healthError) {
      console.error("Health endpoint error:", healthError)
      return NextResponse.json({
        success: false,
        message: `VCMサーバーへの接続でエラーが発生しました: ${healthError instanceof Error ? healthError.message : "不明なエラー"}`,
        error: healthError instanceof Error ? healthError.name : "UnknownError",
        troubleshooting: [
          "VCMサーバーが起動しているか確認してください",
          "ネットワーク接続を確認してください",
          "ファイアウォールの設定を確認してください",
          "URLが正しいか確認してください",
        ],
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
