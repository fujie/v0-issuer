import { NextResponse } from "next/server"
import { getPreAuthCode, removePreAuthCode, getAuthRequest, removeAuthRequest, storeToken } from "@/lib/storage"

export async function POST(request: Request) {
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

    const grantType = requestData.grant_type

    if (grantType === "authorization_code") {
      return handleAuthorizationCodeGrant(requestData)
    } else if (grantType === "urn:ietf:params:oauth:grant-type:pre-authorized_code") {
      return handlePreAuthorizedCodeGrant(requestData)
    } else {
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Grant type not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Token endpoint error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
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

  if (!preAuthCode) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing pre-authorized_code" },
      { status: 400 },
    )
  }

  // Validate pre-authorized code
  const preAuthData = getPreAuthCode(preAuthCode)

  if (!preAuthData || preAuthData.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Pre-authorized code not found or expired" },
      { status: 400 },
    )
  }

  // Check user PIN if required
  if (preAuthData.userPinRequired && preAuthData.userPin !== user_pin) {
    return NextResponse.json({ error: "invalid_grant", error_description: "Invalid user PIN" }, { status: 400 })
  }

  // Generate tokens
  const accessToken = generateToken()
  const cNonce = generateNonce()
  const expiresIn = 3600

  // Store token information
  storeToken(accessToken, {
    userId: preAuthData.userId,
    scope: "openid",
    clientId: "wallet",
    expiresAt: Date.now() + expiresIn * 1000,
    cNonce,
    cNonceExpiresAt: Date.now() + 300000, // 5 minutes
  })

  // Remove used pre-authorized code
  removePreAuthCode(preAuthCode)

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    c_nonce: cNonce,
    c_nonce_expires_in: 300,
  })
}

function generateToken(): string {
  return "at_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 10)
}
