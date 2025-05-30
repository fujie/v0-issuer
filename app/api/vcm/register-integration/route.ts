import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, useMockData, integration } = await request.json()

    if (useMockData) {
      // Return mock success for demo mode
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return NextResponse.json({
        success: true,
        integration: {
          id: "demo-integration-123",
          name: integration.name,
          url: integration.url,
          status: "active",
          autoSync: integration.autoSync || false,
          lastSync: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
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

    try {
      const response = await fetch(`${baseUrl}/api/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ...integration,
          apiKey: apiKey,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          {
            success: false,
            message: `HTTP ${response.status}: ${errorData.message || response.statusText}`,
          },
          { status: response.status },
        )
      }

      const data = await response.json()
      return NextResponse.json({
        success: true,
        integration: data.integration || data.data || data,
      })
    } catch (error) {
      console.error("Failed to register integration:", error)
      return NextResponse.json(
        {
          success: false,
          message: `統合の登録に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("VCM register integration API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `APIエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
