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
      })
    }

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Base URLとAPI Keyが必要です",
        },
        { status: 400 },
      )
    }

    console.log(`Testing VCM connection to: ${baseUrl}`)

    // Test the health endpoint first
    try {
      const healthEndpoint = `${baseUrl}/api/health`
      console.log(`Checking health endpoint: ${healthEndpoint}`)

      const healthResponse = await fetch(healthEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 seconds
      })

      console.log(`Health endpoint response status: ${healthResponse.status}`)

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
            },
            body: JSON.stringify({
              source: "student-login-site",
              timestamp: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(10000),
          })

          console.log(`Auth endpoint response status: ${authResponse.status}`)

          if (authResponse.ok) {
            return NextResponse.json({
              success: true,
              message: "VCMとの接続が正常に確立されました",
              version: healthData.version || "unknown",
            })
          } else {
            let errorMessage = `認証エラー (${authResponse.status}): ${authResponse.statusText}`
            try {
              const errorData = await authResponse.json()
              errorMessage = `認証エラー (${authResponse.status}): ${errorData.message || authResponse.statusText}`
            } catch (e) {
              // If we can't parse JSON, just use the status text
            }

            return NextResponse.json({
              success: false,
              message: errorMessage,
              statusCode: authResponse.status,
            })
          }
        } catch (authError) {
          console.error("Auth endpoint error:", authError)
          return NextResponse.json({
            success: false,
            message: `認証テストでエラーが発生しました: ${authError instanceof Error ? authError.message : "不明なエラー"}`,
            error: authError instanceof Error ? authError.name : "UnknownError",
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          message: `VCMサーバーに接続できません (${healthResponse.status}): ${healthResponse.statusText}`,
          statusCode: healthResponse.status,
        })
      }
    } catch (healthError) {
      console.error("Health endpoint error:", healthError)
      return NextResponse.json({
        success: false,
        message: `VCMサーバーへの接続でエラーが発生しました: ${healthError instanceof Error ? healthError.message : "不明なエラー"}`,
        error: healthError instanceof Error ? healthError.name : "UnknownError",
      })
    }
  } catch (error) {
    console.error("VCM connection test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        error: error instanceof Error ? error.name : "UnknownError",
      },
      { status: 500 },
    )
  }
}
