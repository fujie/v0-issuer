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

    // Test the health endpoint first
    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 seconds
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()

        // Test authentication with the integrations endpoint
        try {
          const authResponse = await fetch(`${baseUrl}/api/integrations/test`, {
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

          if (authResponse.ok) {
            return NextResponse.json({
              success: true,
              message: "VCMとの接続が正常に確立されました",
              version: healthData.version || "unknown",
            })
          } else {
            const errorData = await authResponse.json().catch(() => ({}))
            return NextResponse.json({
              success: false,
              message: `認証エラー (${authResponse.status}): ${errorData.message || authResponse.statusText}`,
            })
          }
        } catch (authError) {
          return NextResponse.json({
            success: false,
            message: `認証テストでエラーが発生しました: ${authError instanceof Error ? authError.message : "不明なエラー"}`,
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          message: `VCMサーバーに接続できません (${healthResponse.status}): ${healthResponse.statusText}`,
        })
      }
    } catch (healthError) {
      return NextResponse.json({
        success: false,
        message: `VCMサーバーへの接続でエラーが発生しました: ${healthError instanceof Error ? healthError.message : "不明なエラー"}`,
      })
    }
  } catch (error) {
    console.error("VCM connection test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `接続テストでエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
