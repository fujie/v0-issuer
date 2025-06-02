import { NextResponse } from "next/server"
import { IssuerMetadataGenerator } from "@/lib/issuer-metadata-generator"
import { headers } from "next/headers"

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

// VCM設定を環境変数から読み込む
function loadVcmConfigFromEnv() {
  try {
    const vcmConfigStr = process.env.VCM_CONFIG
    if (vcmConfigStr) {
      console.log("API: Found VCM_CONFIG environment variable")
      try {
        const vcmConfig = JSON.parse(vcmConfigStr)
        console.log("API: Parsed VCM_CONFIG:", {
          enabled: vcmConfig.enabled,
          templatesCount: vcmConfig.syncedTemplates?.length || 0,
        })

        // グローバル変数に保存
        if (typeof global !== "undefined") {
          global.vcmConfig = vcmConfig
          console.log("API: Saved VCM_CONFIG to global.vcmConfig")
        }

        return vcmConfig
      } catch (error) {
        console.error("API: Error parsing VCM_CONFIG:", error)
      }
    } else {
      console.log("API: No VCM_CONFIG environment variable found")
    }
  } catch (error) {
    console.error("API: Error accessing environment variable:", error)
  }
  return null
}

export async function GET(request: Request) {
  try {
    console.log("API: Generating issuer metadata")

    // VCM設定を環境変数から読み込む
    const vcmConfig = loadVcmConfigFromEnv()

    // グローバル変数の状態を確認
    if (typeof global !== "undefined") {
      console.log("API: global.vcmConfig exists:", !!global.vcmConfig)
      if (global.vcmConfig) {
        console.log("API: global.vcmConfig templates count:", global.vcmConfig.syncedTemplates?.length || 0)
      }
    }

    // リクエストURLからベースURLを取得
    const headersList = headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    console.log("API: Using baseUrl:", baseUrl)

    // 新しいライブラリを使用してメタデータを生成（VCMとStatic両方を含む）
    const metadata = await IssuerMetadataGenerator.generateIssuerMetadata(baseUrl, {
      showVCM: true,
      showStatic: true,
      useServerSync: true, // サーバーサイドでの同期データを使用
    })

    // CORSヘッダーを設定
    return NextResponse.json(metadata, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    console.error("API: Error generating issuer metadata:", error)

    // エラーレスポンス
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "An error occurred generating issuer metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
