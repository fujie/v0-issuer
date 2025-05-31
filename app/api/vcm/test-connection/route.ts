import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, apiKey, useMockData } = body

    console.log("VCM connection test:", { baseUrl, apiKey: apiKey ? "***" : null, useMockData })

    if (!baseUrl || !apiKey) {
      return NextResponse.json({
        success: false,
        message: "Base URLとAPI Keyが必要です",
        statusCode: 400,
      })
    }

    // デモモードが明示的に指定されている場合
    if (useMockData) {
      console.log("Demo mode explicitly enabled")
      await new Promise((resolve) => setTimeout(resolve, 500)) // デモ用の遅延

      return NextResponse.json({
        success: true,
        message: "デモモード: 接続テストをシミュレートしました",
        mode: "demo",
        healthData: {
          service: "VCM Demo Service",
          version: "1.0.0-demo",
          status: "healthy",
          authentication: {
            required: true,
            status: "valid",
          },
          features: {
            credentialTypes: true,
            issuance: true,
            verification: true,
            webhooks: true,
          },
        },
      })
    }

    // 実際のVCMとの接続テスト
    console.log(`Testing connection to VCM at ${baseUrl}`)

    try {
      // まず基本的なヘルスチェックを試行
      const healthEndpoints = ["/api/health", "/health", "/api/status"]
      let healthResult = null
      let healthEndpoint = null

      for (const endpoint of healthEndpoints) {
        try {
          const healthUrl = `${baseUrl}${endpoint}`
          console.log(`Trying health check at: ${healthUrl}`)

          const healthResponse = await fetch(healthUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
              Authorization: `Bearer ${apiKey}`,
              "User-Agent": "Student-Login-Site/1.0",
            },
            signal: AbortSignal.timeout(10000), // 10秒
          })

          console.log(`Health check response: ${healthResponse.status}`)

          if (healthResponse.ok) {
            healthResult = await healthResponse.json()
            healthEndpoint = endpoint
            break
          } else if (healthResponse.status === 401) {
            // 認証エラーの場合、POSTで認証情報を送信
            console.log("Authentication required, trying POST with credentials")

            const authResponse = await fetch(healthUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
                Authorization: `Bearer ${apiKey}`,
                "User-Agent": "Student-Login-Site/1.0",
              },
              body: JSON.stringify({
                apiKey: apiKey,
                source: "student-login-site",
              }),
              signal: AbortSignal.timeout(10000),
            })

            if (authResponse.ok) {
              healthResult = await authResponse.json()
              healthEndpoint = endpoint
              break
            }
          }
        } catch (endpointError) {
          console.log(`Health check failed for ${endpoint}:`, endpointError)
          continue
        }
      }

      if (healthResult) {
        console.log("VCM health check successful:", healthResult)

        return NextResponse.json({
          success: true,
          message: "VCMとの接続が正常に確立されました",
          mode: "production",
          method: "GET",
          endpoint: healthEndpoint,
          healthData: {
            service: healthResult.service || "VCM Service",
            version: healthResult.version || "unknown",
            status: healthResult.status || "healthy",
            authentication: {
              required: true,
              status: "valid",
            },
            features: healthResult.features || {
              credentialTypes: true,
              issuance: true,
              verification: true,
              webhooks: true,
            },
          },
        })
      } else {
        // ヘルスチェックが失敗した場合、クレデンシャルタイプエンドポイントを直接試行
        console.log("Health check failed, trying credential types endpoint directly")

        const credentialTypesUrl = `${baseUrl}/api/credential-types`
        const credentialTypesResponse = await fetch(credentialTypesUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "Student-Login-Site/1.0",
          },
          signal: AbortSignal.timeout(10000),
        })

        if (credentialTypesResponse.ok) {
          console.log("Credential types endpoint accessible")

          return NextResponse.json({
            success: true,
            message: "VCMのクレデンシャルタイプエンドポイントにアクセスできました",
            mode: "production",
            method: "GET",
            endpoint: "/api/credential-types",
            statusCode: credentialTypesResponse.status,
            healthData: {
              service: "VCM Service",
              version: "unknown",
              status: "accessible",
              authentication: {
                required: true,
                status: "valid",
              },
              features: {
                credentialTypes: true,
                issuance: false,
                verification: false,
                webhooks: false,
              },
            },
          })
        } else {
          console.error(`Credential types endpoint failed: ${credentialTypesResponse.status}`)

          return NextResponse.json({
            success: false,
            message: `VCMへの接続に失敗しました (${credentialTypesResponse.status})`,
            statusCode: credentialTypesResponse.status,
            endpoint: "/api/credential-types",
            error: "ConnectionFailed",
            troubleshooting: [
              "VCMサーバーが起動していることを確認してください",
              "API Keyが正しいことを確認してください",
              "ネットワーク接続を確認してください",
              "VCMのログを確認してください",
            ],
            suggestedActions: ["VCMサーバーの状態を確認する", "API Keyを再確認する", "デモモードを試す"],
          })
        }
      }
    } catch (connectionError) {
      console.error("VCM connection error:", connectionError)

      const errorMessage = connectionError instanceof Error ? connectionError.message : "Unknown error"

      return NextResponse.json({
        success: false,
        message: `VCMへの接続でエラーが発生しました: ${errorMessage}`,
        error: connectionError instanceof Error ? connectionError.name : "UnknownError",
        troubleshooting: [
          "VCMサーバーのURLが正しいことを確認してください",
          "VCMサーバーが起動していることを確認してください",
          "ファイアウォールやプロキシの設定を確認してください",
          "ネットワーク接続を確認してください",
        ],
        suggestedActions: ["VCMサーバーの状態を確認する", "ネットワーク設定を確認する", "デモモードを試す"],
      })
    }
  } catch (error) {
    console.error("Connection test API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
