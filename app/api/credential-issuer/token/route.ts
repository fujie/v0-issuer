import { NextResponse } from "next/server"
import { getAuthRequest, removeAuthRequest, storeToken } from "@/lib/storage"

// CORS headers helper function
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, User-Agent, Cache-Control")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export async function OPTIONS(request: Request) {
  console.log("=== Token endpoint OPTIONS request ===")
  console.log("Headers:", Object.fromEntries(request.headers.entries()))

  const response = new NextResponse(null, { status: 200 })
  return setCorsHeaders(response)
}

export async function POST(request: Request) {
  console.log("=== Token endpoint POST request ===")
  console.log("Headers:", Object.fromEntries(request.headers.entries()))

  try {
    const contentType = request.headers.get("content-type") || ""
    let requestData: any = {}

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        requestData[key] = value
      })
    } else if (contentType.includes("application/json")) {
      requestData = await request.json()
    }

    console.log("Request data:", requestData)

    const grantType = requestData.grant_type

    if (grantType === "authorization_code") {
      const response = handleAuthorizationCodeGrant(requestData)
      return setCorsHeaders(response)
    } else if (grantType === "urn:ietf:params:oauth:grant-type:pre-authorized_code") {
      const response = handlePreAuthorizedCodeGrant(requestData)
      return setCorsHeaders(response)
    } else {
      const response = NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Grant type not supported" },
        { status: 400 },
      )
      return setCorsHeaders(response)
    }
  } catch (error) {
    console.error("Token endpoint error:", error)
    const response = NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
    return setCorsHeaders(response)
  }
}

function handleAuthorizationCodeGrant(requestData: any) {
  const { code, redirect_uri, client_id, code_verifier } = requestData

  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 },
    )
  }

  // Retrieve the stored authorization request
  const authRequest = getAuthRequest(code)

  if (!authRequest || authRequest.timestamp < Date.now() - 600000) {
    // 10 minutes expiry
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Authorization code not found or expired" },
      { status: 400 },
    )
  }

  // Validate parameters
  if (authRequest.clientId !== client_id || authRequest.redirectUri !== redirect_uri) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid client or redirect URI" },
      { status: 400 },
    )
  }

  // Generate tokens
  const accessToken = generateToken()
  const cNonce = generateNonce()
  const expiresIn = 3600

  // Store token information
  storeToken(accessToken, {
    userId: authRequest.userId,
    scope: authRequest.scope,
    clientId: authRequest.clientId,
    issuerState: authRequest.issuerState,
    expiresAt: Date.now() + expiresIn * 1000,
    cNonce,
    cNonceExpiresAt: Date.now() + 300000, // 5 minutes
  })

  // Remove used authorization code
  removeAuthRequest(code)

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    c_nonce: cNonce,
    c_nonce_expires_in: 300,
  })
}

function handlePreAuthorizedCodeGrant(requestData: any) {
  const { "pre-authorized_code": preAuthCode, user_pin } = requestData

  console.log("=== Pre-authorized code grant (TEST MODE) ===")
  console.log("Pre-auth code:", preAuthCode)
  console.log("User PIN:", user_pin)

  if (!preAuthCode) {
    console.log("ERROR: Missing pre-authorized_code")
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing pre-authorized_code" },
      { status: 400 },
    )
  }

  // ===== TEST MODE: Skip validation =====
  console.log("⚠️  TEST MODE: Skipping pre-authorized code validation")
  console.log("⚠️  In production, proper validation should be implemented")

  // Skip validation and always proceed with token generation
  // const preAuthData = getPreAuthCode(preAuthCode)
  // if (!preAuthData || preAuthData.expiresAt < Date.now()) {
  //   return NextResponse.json(
  //     { error: "invalid_grant", error_description: "Pre-authorized code not found or expired" },
  //     { status: 400 },
  //   )
  // }

  // Generate tokens with test user data
  const accessToken = generateToken()
  const cNonce = generateNonce()
  const expiresIn = 3600

  console.log("Generated access token:", accessToken)
  console.log("Generated c_nonce:", cNonce)

  // Store token information with test data
  storeToken(accessToken, {
    userId: "test-user-123", // Test user ID
    scope: "openid",
    clientId: "wallet",
    expiresAt: Date.now() + expiresIn * 1000,
    cNonce,
    cNonceExpiresAt: Date.now() + 300000, // 5 minutes
  })

  // Skip removing pre-authorized code in test mode
  // removePreAuthCode(preAuthCode)

  const tokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    c_nonce: cNonce,
    c_nonce_expires_in: 300,
  }

  console.log("Token response:", tokenResponse)
  console.log("=== Pre-authorized code grant completed ===")

  return NextResponse.json(tokenResponse)
}

function generateToken(): string {
  return "at_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 10)
}
