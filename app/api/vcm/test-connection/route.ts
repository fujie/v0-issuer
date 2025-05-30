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
        healthData: {
          status: "healthy",
          service: "Verifiable Credential Manager (Demo)",
          version: "demo-1.0.0",
          authentication: {
            required: false,
            status: "not_required",
          },
          features: {
            credentialTypes: true,
            credentialIssuance: true,
            credentialRevocation: true,
            webhooks: true,
            sync: true,
          },
        },
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

    // Test VCM's health endpoint
    try {
      const healthEndpoint = `${baseUrl}/api/health`
      console.log(`Testing VCM health endpoint: ${healthEndpoint}`)

      // First try GET request
      const getResponse = await fetch(healthEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Student-Login-Site/1.0",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000), // 10 seconds
      })

      console.log(`VCM health GET response status: ${getResponse.status}`)

      if (getResponse.ok) {
        const healthData = await getResponse.json()
        console.log("VCM health data:", healthData)

        return NextResponse.json({
          success: true,
          message: "VCMとの接続が正常に確立されました",
          version: healthData.version || "unknown",
          mode: "production",
          endpoint: healthEndpoint,
          method: "GET",
          healthData: healthData,
          authentication: healthData.authentication || { required: false, status: "unknown" },
        })
      } else if (getResponse.status === 401) {
        // Try POST request with authentication in body
        console.log("GET request returned 401, trying POST with body authentication")

        const postResponse = await fetch(healthEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Student-Login-Site/1.0",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            source: "student-login-site",
            timestamp: new Date().toISOString(),
            apiKey: apiKey,
          }),
          signal: AbortSignal.timeout(10000),
        })

        console.log(`VCM health POST response status: ${postResponse.status}`)

        if (postResponse.ok) {
          const healthData = await postResponse.json()
          console.log("VCM health data (POST):", healthData)

          return NextResponse.json({
            success: true,
            message: "VCMとの接続が正常に確立されました（認証済み）",
            version: healthData.version || "unknown",
            mode: "production",
            endpoint: healthEndpoint,
            method: "POST",
            healthData: healthData,
            authentication: healthData.authentication || { required: true, status: "authenticated" },
          })
        } else if (postResponse.status === 401) {
          let errorMessage = "認証エラー: 無効なAPI Key"
          try {
            const errorData = await postResponse.json()
            errorMessage = `認証エラー: ${errorData.message || "無効なAPI Key"}`
          } catch (e) {
            // If we can't parse JSON, use default message
          }

          return NextResponse.json({
            success: false,
            message: errorMessage,
            statusCode: 401,
            endpoint: healthEndpoint,
            troubleshooting: [
              "API Keyが正しいか確認してください",
              "VCMサーバーでAPI Keyが有効になっているか確認してください",
              "API Keyの権限が適切に設定されているか確認してください",
              "VCMサーバーの認証設定を確認してください",
            ],
          })
        } else {
          // Handle other POST errors
          let errorMessage = `VCMサーバーエラー (${postResponse.status}): ${postResponse.statusText}`
          try {
            const errorData = await postResponse.json()
            errorMessage = `VCMサーバーエラー (${postResponse.status}): ${errorData.error || postResponse.statusText}`
          } catch (e) {
            // If we can't parse JSON, use status text
          }

          return NextResponse.json({
            success: false,
            message: errorMessage,
            statusCode: postResponse.status,
            troubleshooting: [
              "VCMサーバーが正常に動作しているか確認してください",
              "サーバーのログを確認してください",
              "一時的な問題の可能性があります。しばらく待ってから再試行してください",
            ],
          })
        }
      } else if (getResponse.status === 404) {
        return NextResponse.json({
          success: false,
          message: "VCMのヘルスエンドポイントが見つかりません",
          statusCode: 404,
          endpoint: healthEndpoint,
          troubleshooting: [
            "VCMサーバーが正しく起動しているか確認してください",
            "VCMのバージョンが最新か確認してください",
            "エンドポイントパス /api/health が実装されているか確認してください",
            "デモモードを使用することをお勧めします",
          ],
        })
      } else if (getResponse.status === 503) {
        let errorMessage = "VCMサーバーが利用できません"
        try {
          const errorData = await getResponse.json()
          errorMessage = `VCMサーバーが利用できません: ${errorData.error || "サービス停止中"}`
        } catch (e) {
          // If we can't parse JSON, use default message
        }

        return NextResponse.json({
          success: false,
          message: errorMessage,
          statusCode: 503,
          troubleshooting: [
            "VCMサーバーが一時的に利用できない状態です",
            "サーバーのログを確認してください",
            "データベース接続を確認してください",
            "しばらく待ってから再試行してください",
          ],
        })
      } else {
        // Handle other GET errors
        let errorMessage = `VCMサーバーエラー (${getResponse.status}): ${getResponse.statusText}`
        try {
          const errorData = await getResponse.json()
          errorMessage = `VCMサーバーエラー (${getResponse.status}): ${errorData.error || getResponse.statusText}`
        } catch (e) {
          // If we can't parse JSON, use status text
        }

        return NextResponse.json({
          success: false,
          message: errorMessage,
          statusCode: getResponse.status,
          troubleshooting: [
            "VCMサーバーが正常に動作しているか確認してください",
            "サーバーのログを確認してください",
            "一時的な問題の可能性があります。しばらく待ってから再試行してください",
          ],
        })
      }
    } catch (connectionError) {
      console.error("VCM connection test error:", connectionError)

      let errorMessage = "VCMサーバーへの接続でエラーが発生しました"
      let troubleshooting = [
        "VCMサーバーが起動しているか確認してください",
        "ネットワーク接続を確認してください",
        "URLが正しいか確認してください",
        "デモモードを使用することをお勧めします",
      ]

      if (connectionError instanceof Error) {
        if (connectionError.name === "TimeoutError") {
          errorMessage = "VCMサーバーへの接続がタイムアウトしました"
          troubleshooting = [
            "VCMサーバーの応答が遅い可能性があります",
            "ネットワーク接続を確認してください",
            "VCMサーバーが過負荷状態でないか確認してください",
            "しばらく待ってから再試行してください",
          ]
        } else if (connectionError.message.includes("fetch")) {
          errorMessage = "VCMサーバーに到達できません"
          troubleshooting = [
            "URLが正しいか確認してください",
            "VCMサーバーが起動しているか確認してください",
            "ファイアウォールの設定を確認してください",
            "インターネット接続を確認してください",
          ]
        }
      }

      return NextResponse.json({
        success: false,
        message: `${errorMessage}: ${connectionError instanceof Error ? connectionError.message : "不明なエラー"}`,
        error: connectionError instanceof Error ? connectionError.name : "UnknownError",
        troubleshooting,
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
