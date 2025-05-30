import { type NextRequest, NextResponse } from "next/server"

// 管理者用のクレデンシャルタイプ同期エンドポイント
export async function POST(request: NextRequest) {
  try {
    // 管理者権限のチェック（実際の実装では適切な認証を行う）
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin authentication required",
        },
        { status: 401 },
      )
    }

    // メインの同期エンドポイントに処理を委譲
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

    // 管理者用の追加情報を含める
    if (data.success) {
      data.data.adminNote = "Synced via admin endpoint"
      data.data.endpoint = "/api/admin/credential-types"
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Admin sync endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process admin sync request",
      },
      { status: 500 },
    )
  }
}

// 管理者用の同期状況取得
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin authentication required",
        },
        { status: 401 },
      )
    }

    // 詳細な同期情報を返す
    const adminSyncInfo = {
      lastSync: new Date().toISOString(),
      syncedCount: 0, // 実際の実装では、データベースから取得
      totalCredentialTypes: 0, // 実際の実装では、データベースから取得
      syncHistory: [], // 実際の実装では、同期履歴を取得
      status: "ready",
      endpoints: ["/api/credential-types/sync", "/api/sync/credential-types", "/api/admin/credential-types"],
    }

    return NextResponse.json({
      success: true,
      data: adminSyncInfo,
    })
  } catch (error) {
    console.error("Admin sync info error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get admin sync information",
      },
      { status: 500 },
    )
  }
}
