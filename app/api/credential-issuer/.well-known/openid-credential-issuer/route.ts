import { NextResponse } from "next/server"
import { OpenID4VCIMetadataGenerator } from "@/lib/openid4vci-utils"

export async function GET(request: Request) {
  try {
    // リクエストのベースURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // OpenID4VCI Issuer Metadataを生成
    const metadata = await OpenID4VCIMetadataGenerator.generateIssuerMetadata(baseUrl)

    // CORS対応
    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    console.error("Error generating issuer metadata:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred generating issuer metadata" },
      { status: 500 },
    )
  }
}
