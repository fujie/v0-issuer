import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("Standard endpoint /.well-known/openid-credential-issuer called")

  try {
    // リクエストURLからbaseURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    console.log("Redirecting to API endpoint from:", baseUrl)

    // APIエンドポイントにリダイレクト
    const redirectUrl = new URL("/api/well-known/openid-credential-issuer", baseUrl)

    console.log("Redirect URL:", redirectUrl.toString())

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("Error in standard endpoint redirect:", error)

    // リダイレクトに失敗した場合は、直接レスポンスを返す
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "Failed to redirect to API endpoint",
      },
      { status: 500 },
    )
  }
}
