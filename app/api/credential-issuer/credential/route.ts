import { NextResponse } from "next/server"
import { getToken } from "@/lib/storage"
import { getCredentialTemplate } from "@/lib/credential-templates"

// CORS headers helper function
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, User-Agent, Cache-Control")
  response.headers.set("Access-Control-Max-Age", "86400")
  response.headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
  response.headers.set("Vary", "Origin")
  return response
}

export async function OPTIONS(request: Request) {
  console.log("=== Credential Endpoint OPTIONS Request ===")
  console.log("Headers:", Object.fromEntries(request.headers.entries()))

  const response = new NextResponse(null, { status: 200 })
  return setCorsHeaders(response)
}

export async function POST(request: Request) {
  console.log("=== Credential Endpoint POST Request ===")
  console.log("Headers:", Object.fromEntries(request.headers.entries()))

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
      console.log("Unsupported content type:", contentType)
      const response = NextResponse.json(
        { error: "invalid_request", error_description: "Unsupported content type" },
        { status: 400 },
      )
      return setCorsHeaders(response)
    }

    console.log("Request data:", requestData)

    // Extract credential request parameters according to OpenID4VCI spec
    const { format, credential_definition, proof, types, credential_identifier, credential_configuration_id } =
      requestData

    // Determine which credential configuration to use
    const configId = credential_configuration_id || credential_identifier
    console.log("Requested credential configuration ID:", configId)

    if (!configId) {
      console.log("Missing credential_configuration_id or credential_identifier")
      const response = NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing credential_configuration_id or credential_identifier",
        },
        { status: 400 },
      )
      return setCorsHeaders(response)
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization") || ""
    const accessToken = authHeader.replace("Bearer ", "")

    console.log("Authorization header present:", !!authHeader)
    console.log("Access token (first 10 chars):", accessToken.substring(0, 10) + "...")

    // Get student info from access token (TEST MODE: use any token)
    let studentInfo: any = null
    let userId = "test-user-123" // fallback

    if (accessToken) {
      try {
        const tokenData = getToken(accessToken)
        if (tokenData && tokenData.studentInfo) {
          studentInfo = tokenData.studentInfo
          userId = tokenData.userId
          console.log("Found student info from token:", studentInfo)
        } else {
          console.log("No student info found in token, using default")
        }
      } catch (error) {
        console.log("Error getting token data:", error)
      }
    }

    // Fallback to default student info if not found
    if (!studentInfo) {
      studentInfo = getDefaultStudentInfo()
      console.log("Using default student info")
    }

    console.log("Student info to use:", studentInfo)

    // Validate proof if provided (optional for testing)
    if (proof) {
      const { proof_type, jwt } = proof
      console.log("Proof provided:", { proof_type, jwt: jwt ? "present" : "not present" })
      if (proof_type === "jwt") {
        console.log("JWT proof detected - skipping validation for test mode")
      }
    }

    // Get credential template based on configuration ID
    const credentialTemplate = await getCredentialTemplateById(configId)
    if (!credentialTemplate) {
      console.log("Credential configuration not found:", configId)
      const response = NextResponse.json(
        {
          error: "invalid_credential_request",
          error_description: `Credential configuration '${configId}' not found`,
        },
        { status: 400 },
      )
      return setCorsHeaders(response)
    }

    console.log("Found credential template:", credentialTemplate.name)

    // Generate credential based on template and student info
    console.log("Generating credential with format:", format || "vc+sd-jwt")
    const credential = await generateCredentialFromTemplate(
      userId,
      studentInfo,
      credentialTemplate,
      format || "vc+sd-jwt",
    )

    // Generate new c_nonce for next request
    const newCNonce = generateNonce()
    console.log("Generated new c_nonce:", newCNonce)

    const responseData = {
      format: format || "vc+sd-jwt",
      credential,
      c_nonce: newCNonce,
      c_nonce_expires_in: 300,
    }

    console.log("Credential response prepared successfully")
    console.log("Response format:", responseData.format)
    console.log("Credential length:", credential.length)

    const response = NextResponse.json(responseData)
    return setCorsHeaders(response)
  } catch (error) {
    console.error("Credential endpoint error:", error)
    const response = NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
    return setCorsHeaders(response)
  }
}

async function getCredentialTemplateById(configId: string) {
  console.log("=== Getting Credential Template ===")
  console.log("Configuration ID:", configId)

  // 新しいgetCredentialTemplate関数を使用
  try {
    const template = await getCredentialTemplate(configId)
    if (template) {
      console.log("Found template:", template.name)
      return template
    }
  } catch (error) {
    console.log("Error getting template:", error)
  }

  // VCMテンプレートの-vcmサフィックス付きで再試行
  const vcmConfigId = configId.endsWith("-vcm") ? configId : `${configId}-vcm`
  try {
    const template = await getCredentialTemplate(vcmConfigId)
    if (template) {
      console.log("Found VCM template with suffix:", template.name)
      return template
    }
  } catch (error) {
    console.log("Error getting VCM template with suffix:", error)
  }

  console.log("Template not found for configuration ID:", configId)
  return null
}

async function generateCredentialFromTemplate(
  userId: string,
  studentInfo: any,
  template: any,
  format: string,
): Promise<string> {
  console.log("=== Generating Credential from Template ===")
  console.log("User ID:", userId)
  console.log("Student Info:", studentInfo)
  console.log("Template:", template.name)
  console.log("Format:", format)

  // Base64url encoding function
  function base64url(data: string) {
    const utf8Bytes = new TextEncoder().encode(data)
    let binaryStr = ""
    utf8Bytes.forEach((byte) => {
      binaryStr += String.fromCharCode(byte)
    })
    return btoa(binaryStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
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

  // Prepare claims based on template and student info
  const claimsData: Record<string, any> = {}
  const disclosures: string[] = []
  const disclosureDigests: string[] = []

  // Process template claims
  if (template.claims) {
    template.claims.forEach((claim: any) => {
      let value: any

      // Map claim key to student info
      if (studentInfo[claim.key] !== undefined) {
        value = studentInfo[claim.key]
      } else if (claim.defaultValue !== undefined) {
        value = claim.defaultValue
      } else {
        // Map common fields
        switch (claim.key) {
          case "fullName":
          case "name":
            value = studentInfo.name || studentInfo.fullName
            break
          case "studentNumber":
          case "studentId":
            value = studentInfo.studentId || studentInfo.studentNumber
            break
          case "faculty":
          case "department":
            value = studentInfo.department || studentInfo.faculty
            break
          case "status":
          case "studentStatus":
            value = studentInfo.status || studentInfo.studentStatus || "enrolled"
            break
          case "enrollmentYear":
            value = studentInfo.enrollmentYear
            break
          case "gpa":
            value = studentInfo.gpa
            break
          case "totalCredits":
            value = studentInfo.totalCredits
            break
          case "academicYear":
          case "currentYear":
            value = studentInfo.academicYear || studentInfo.currentYear
            break
          case "major":
            value = studentInfo.major
            break
          case "degree":
            value = studentInfo.degree
            break
          case "graduationDate":
            value = studentInfo.graduationDate
            break
          case "email":
            value = studentInfo.email
            break
          case "enrollmentStatus":
            value = studentInfo.enrollmentStatus
            break
          default:
            if (claim.required) {
              console.warn(`Required claim '${claim.key}' not found in student data`)
            }
            return
        }
      }

      if (value !== undefined) {
        if (claim.selectiveDisclosure) {
          // Create disclosure for selective disclosure claims
          const salt = generateSalt()
          const disclosureArray = [salt, claim.key, value]
          const disclosure = base64url(JSON.stringify(disclosureArray))
          disclosures.push(disclosure)
          disclosureDigests.push(disclosure)
          console.log(`Added selective disclosure claim: ${claim.key} = ${value}`)
        } else {
          // Add directly to credential subject for non-selective disclosure claims
          claimsData[claim.key] = value
          console.log(`Added direct claim: ${claim.key} = ${value}`)
        }
      }
    })
  } else {
    // Fallback for templates without claims structure
    const defaultClaims = {
      name: studentInfo.name || studentInfo.fullName,
      studentId: studentInfo.studentId || studentInfo.studentNumber,
      department: studentInfo.department || studentInfo.faculty,
      status: studentInfo.status || studentInfo.studentStatus || "enrolled",
    }

    Object.entries(defaultClaims).forEach(([key, value]) => {
      if (value !== undefined) {
        const salt = generateSalt()
        const disclosureArray = [salt, key, value]
        const disclosure = base64url(JSON.stringify(disclosureArray))
        disclosures.push(disclosure)
        disclosureDigests.push(disclosure)
        console.log(`Added fallback selective disclosure claim: ${key} = ${value}`)
      }
    })
  }

  console.log("Generated disclosures:", disclosures.length)
  console.log("Claims data:", claimsData)

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: template.issuer || "https://university-issuer.example.com",
    sub: userId,
    iat: now,
    exp: now + (template.validityPeriod || 30) * 24 * 60 * 60,
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: "7xbG-J0AQtpPArBOYNv1x9_JPvgBWGI40rZnwjNzTuc",
        y: "pBRgr0oi_I-C_zszVCT3XcCYTq8jar8XYRiUoEhUQ4Y",
      },
    },
    vc: {
      "@context": template.context || ["https://www.w3.org/2018/credentials/v1"],
      type: template.type || ["VerifiableCredential", "StudentCredential"],
      credentialSubject: {
        id: `did:example:${userId}`,
        ...claimsData,
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

  console.log("SD-JWT generated successfully, length:", sdJwt.length)
  return sdJwt
}

function getDefaultStudentInfo() {
  return {
    name: "山田 太郎",
    fullName: "山田 太郎",
    studentId: "S12345678",
    studentNumber: "S12345678",
    department: "工学部 情報工学科",
    faculty: "工学部",
    email: "yamada@example.university.edu",
    status: "enrolled",
    studentStatus: "enrolled",
    enrollmentYear: 2021,
    gpa: 3.75,
    totalCredits: 98,
    academicYear: "4年生",
    major: "情報工学",
    degree: "学士（工学）",
    graduationDate: "2025-03-25",
    currentYear: "4年生",
    enrollmentStatus: "正規生",
  }
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 10)
}
