import { type NextRequest, NextResponse } from "next/server"

// /api/credential-types/sync/route.ts と同じ処理を行う代替エンドポイント
export async function POST(request: NextRequest) {
  try {
    // メインの同期エンドポイントにリダイレクト
    const url = new URL(request.url)
    const syncUrl = `${url.origin}/api/credential-types/sync`

    const response = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("authorization") || "",
        "User-Agent": request.headers.get("user-agent") || "",
      },
      body: JSON.stringify(await request.json()),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Alternative sync endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process sync request via alternative endpoint",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const syncUrl = `${url.origin}/api/credential-types/sync${url.search}`

    const response = await fetch(syncUrl, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("authorization") || "",
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Alternative sync info endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get sync information via alternative endpoint",
      },
      { status: 500 },
    )
  }
}
