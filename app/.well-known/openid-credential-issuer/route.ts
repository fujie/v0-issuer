import { NextResponse } from "next/server"
import { IssuerMetadataGenerator } from "@/lib/issuer-metadata-generator"
import { headers } from "next/headers"

export async function GET(request: Request) {
  try {
    console.log("Well-known: Generating issuer metadata")

    // リクエストURLからベースURLを取得
    const headersList = headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    console.log("Well-known: Using baseUrl:", baseUrl)

    // 新しいライブラリを使用してメタデータを生成（静的テンプレートのみ）
    const metadata = await IssuerMetadataGenerator.generateIssuerMetadata(baseUrl, {
      showVCM: true,
      showStatic: false,
      useServerSync: true, // クライアントサイドでの同期データを利用する
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
    console.error("Well-known: Error generating issuer metadata:", error)

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
