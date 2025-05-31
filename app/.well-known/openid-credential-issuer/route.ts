import { NextResponse } from "next/server"

export async function GET() {
  console.log("Standard endpoint /.well-known/openid-credential-issuer called, redirecting to API endpoint")

  // APIエンドポイントにリダイレクト
  return NextResponse.redirect(
    new URL("/api/well-known/openid-credential-issuer", process.env.VERCEL_URL || "http://localhost:3000"),
  )
}
