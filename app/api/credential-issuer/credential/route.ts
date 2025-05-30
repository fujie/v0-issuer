import { NextResponse } from "next/server"
import { getToken } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let requestData: any = {}

    if (contentType.includes("application/json")) {
      requestData = await request.json()
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        requestData[key] = value
      })
    } else {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Unsupported content type" },
        { status: 400 },
      )
    }

    // Extract credential request parameters
    const { format, credential_definition, proof, types } = requestData

    // Validate access token from Authorization header
    const authHeader = request.headers.get("authorization") || ""
    const accessToken = authHeader.replace("Bearer ", "")

    if (!accessToken) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing access token" }, { status: 401 })
    }

    // Validate token
    const tokenData = getToken(accessToken)

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: "invalid_token", error_description: "Access token is invalid or expired" },
        { status: 401 },
      )
    }

    // Validate proof if provided
    if (proof) {
      const { proof_type, jwt } = proof
      if (proof_type === "jwt") {
        // In a real implementation, validate the JWT proof
        // For demo purposes, we'll skip this validation
      }
    }

    // Generate SD-JWT credential
    const credential = await generateStudentCredential(tokenData.userId, format)

    // Update c_nonce for next request
    const newCNonce = generateNonce()
    tokenData.cNonce = newCNonce
    tokenData.cNonceExpiresAt = Date.now() + 300000

    return NextResponse.json({
      format: format || "vc+sd-jwt",
      credential,
      c_nonce: newCNonce,
      c_nonce_expires_in: 300,
    })
  } catch (error) {
    console.error("Credential endpoint error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
  }
}

async function generateStudentCredential(userId: string, format?: string): Promise<string> {
  // Get user data (in real implementation, fetch from database)
  const userInfo = getUserInfo(userId)

  if (!userInfo) {
    throw new Error("User not found")
  }

  // Base64url encoding function
  function base64url(data: string) {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  // Generate salts for selective disclosure
  function generateSalt() {
    return Math.random().toString(36).substring(2, 15)
  }

  // Create header
  const header = {
    alg: "ES256",
    typ: "vc+sd-jwt",
    kid: "university-issuer-key-2023",
  }

  // Create disclosures
  const salt1 = generateSalt()
  const salt2 = generateSalt()
  const salt3 = generateSalt()
  const salt4 = generateSalt()

  const disclosures = [
    JSON.stringify([salt1, "name", userInfo.name]),
    JSON.stringify([salt2, "studentId", userInfo.studentId]),
    JSON.stringify([salt3, "department", userInfo.department]),
    JSON.stringify([salt4, "status", "enrolled"]),
  ]

  // Calculate disclosure digests (simplified for demo)
  const disclosureDigests = disclosures.map((disclosure) => base64url(disclosure))

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: "https://university-issuer.example.com",
    sub: userId,
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: "7xbG-J0AQtpPArBOYNv1x9_JPvgBWGI40rZnwjNzTuc",
        y: "pBRgr0oi_I-C_zszVCT3XcCYTq8jar8XYRiUoEhUQ4Y",
      },
    },
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
      type: ["VerifiableCredential", "StudentCredential"],
      credentialSubject: {
        id: `did:example:${userId}`,
      },
    },
    _sd: disclosureDigests,
  }

  // Encode header and payload
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))

  // In a real implementation, sign the JWT with a private key
  const signature = "DEMO_SIGNATURE_" + Math.random().toString(36).substring(2, 10)

  // Combine to form the SD-JWT
  const sdJwt = `${encodedHeader}.${encodedPayload}.${signature}~${disclosures.join("~")}`

  return sdJwt
}

function getUserInfo(userId: string) {
  // Demo user data
  const users = {
    "student-123": {
      name: "山田 太郎",
      studentId: "S12345678",
      department: "工学部 情報工学科",
      email: "yamada@example.university.edu",
    },
  }

  return users[userId] || null
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 10)
}
