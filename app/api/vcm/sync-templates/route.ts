import { type NextRequest, NextResponse } from "next/server"

// グローバル型定義
declare global {
  var vcmConfig:
    | {
        enabled: boolean
        useMockData: boolean
        lastSync: string
        syncedTemplates: any[]
      }
    | undefined
}

export async function POST(request: NextRequest) {
  try {
    console.log("VCM templates sync API called")

    const body = await request.json()
    const { templates } = body

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json({ error: "Invalid templates data" }, { status: 400 })
    }

    console.log("Received templates for sync:", templates.length)

    // VCMテンプレートのみをフィルタリング
    const vcmTemplates = templates.filter((t: any) => t.source === "vcm")
    console.log("VCM templates to sync:", vcmTemplates.length)

    if (vcmTemplates.length === 0) {
      return NextResponse.json(
        {
          warning: "No VCM templates found to sync",
          success: false,
          syncedCount: 0,
        },
        { status: 200 },
      )
    }

    // 環境変数形式のデータを作成
    const vcmConfig = {
      enabled: true,
      useMockData: false,
      lastSync: new Date().toISOString(),
      syncedTemplates: vcmTemplates,
    }

    // globalThisを使用してより安全にグローバルメモリに保存
    globalThis.vcmConfig = vcmConfig
    console.log("VCM config saved to global memory with templates:", vcmTemplates.length)

    // デバッグ情報
    console.log(
      "VCM template IDs:",
      vcmTemplates.map((t: any) => t.id),
    )
    console.log("Global memory check after save:", {
      exists: !!globalThis.vcmConfig,
      templatesCount: globalThis.vcmConfig?.syncedTemplates?.length || 0,
    })

    return NextResponse.json({
      success: true,
      message: "Templates synced successfully",
      syncedCount: vcmTemplates.length,
      timestamp: new Date().toISOString(),
      templateIds: vcmTemplates.map((t: any) => t.id),
    })
  } catch (error) {
    console.error("Error syncing VCM templates:", error)
    return NextResponse.json(
      {
        error: "Failed to sync templates",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // 現在の同期状況を返す
    const vcmConfig = globalThis.vcmConfig || null

    console.log("GET sync status:", {
      hasSyncedData: !!vcmConfig,
      templatesCount: vcmConfig?.syncedTemplates?.length || 0,
    })

    return NextResponse.json({
      hasSyncedData: !!vcmConfig,
      lastSync: vcmConfig?.lastSync || null,
      syncedTemplatesCount: vcmConfig?.syncedTemplates?.length || 0,
      syncedTemplates:
        vcmConfig?.syncedTemplates?.map((t: any) => ({
          id: t.id,
          name: t.name,
          source: t.source,
        })) || [],
    })
  } catch (error) {
    console.error("Error getting sync status:", error)
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 })
  }
}
