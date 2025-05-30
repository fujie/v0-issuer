import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Instead of trying to set cookies and redirect directly,
    // return a response with a redirect URL
    return NextResponse.json({
      success: true,
      redirectUrl: "/dashboard-demo",
    })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json(
      { error: "Authentication failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
