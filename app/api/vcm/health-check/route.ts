import { type NextRequest, NextResponse } from "next/server"

// VCMからの接続テストを受け取るエンドポイント
export async function GET(request: NextRequest) {
  try {
    // VCMからの接続テストに応答
    return NextResponse.json({
      success: true,
      status: "healthy",
      service: "Student Login Site",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: "/api/auth",
        credentials: "/api/credential-offers",
        issuer: "/api/credential-issuer",
      },
    })
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // VCMからのPOSTリクエストにも対応
    const body = await request.json()
    console.log("VCM health check request:", body)

    return NextResponse.json({
      success: true,
      status: "healthy",
      service: "Student Login Site",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      receivedData: body,
    })
  } catch (error) {
    console.error("Health check POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
