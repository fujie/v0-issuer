import { NextResponse } from "next/server"
import { storeAuthRequest } from "@/lib/storage"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  // Extract OpenID4VCI authorization parameters
  const responseType = params.get("response_type")
  const clientId = params.get("client_id")
  const redirectUri = params.get("redirect_uri")
  const scope = params.get("scope")
  const state = params.get("state")
  const issuerState = params.get("issuer_state")
  const codeChallenge = params.get("code_challenge")
  const codeChallengeMethod = params.get("code_challenge_method")

  // Validate parameters
  if (!responseType || !clientId || !redirectUri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 },
    )
  }

  // For demo purposes, we'll auto-authorize and generate an authorization code
  const authCode = generateAuthCode()

  // Store the authorization request details
  storeAuthRequest(authCode, {
    clientId,
    redirectUri,
    scope: scope || "openid",
    state,
    issuerState,
    codeChallenge,
    codeChallengeMethod,
    userId: "student-123", // Demo user
    timestamp: Date.now(),
  })

  // Create redirect URL with authorization code
  const redirectUrl = new URL(redirectUri)
  redirectUrl.searchParams.append("code", authCode)
  if (state) {
    redirectUrl.searchParams.append("state", state)
  }

  // Return redirect response
  return NextResponse.redirect(redirectUrl.toString())
}

function generateAuthCode(): string {
  return "auth_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
