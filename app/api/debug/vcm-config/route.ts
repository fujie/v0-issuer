import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== VCM Config Debug ===")

    // 環境変数の確認
    const vcmConfigStr = process.env.VCM_CONFIG
    const hasVcmConfig = !!vcmConfigStr

    console.log("Has VCM_CONFIG:", hasVcmConfig)

    let vcmConfig = null
    let parseError = null
    let syncedTemplatesCount = 0

    if (vcmConfigStr) {
      try {
        vcmConfig = JSON.parse(vcmConfigStr)
        console.log("VCM_CONFIG parsed successfully")

        if (vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
          syncedTemplatesCount = vcmConfig.syncedTemplates.length
          console.log("Synced templates count:", syncedTemplatesCount)
        }
      } catch (error) {
        parseError = error instanceof Error ? error.message : String(error)
        console.error("VCM_CONFIG parse error:", parseError)
      }
    }

    const debugInfo = {
      hasVcmConfig,
      vcmConfigLength: vcmConfigStr ? vcmConfigStr.length : 0,
      parseError,
      syncedTemplatesCount,
      syncedTemplates:
        vcmConfig?.syncedTemplates?.map((t: any) => ({
          id: t.id,
          name: t.name,
          source: t.source,
          claimsCount: Array.isArray(t.claims) ? t.claims.length : 0,
        })) || [],
      lastSync: vcmConfig?.lastSync || null,
      enabled: vcmConfig?.enabled || false,
    }

    console.log("Debug info:", debugInfo)

    return NextResponse.json(debugInfo, {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)

    return NextResponse.json(
      {
        error: "debug_error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
