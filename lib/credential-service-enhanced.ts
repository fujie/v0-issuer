import { CredentialTemplateManager, type EnhancedCredentialTemplate } from "./credential-templates-enhanced"

export interface CredentialIssuanceRequest {
  templateId: string
  userId: string
  customClaims?: Record<string, any>
  selectedClaims?: string[]
}

export async function issueCredentialFromTemplate(request: CredentialIssuanceRequest): Promise<string> {
  const template = await CredentialTemplateManager.getTemplate(request.templateId)
  if (!template) {
    throw new Error(`クレデンシャルテンプレート '${request.templateId}' が見つかりません`)
  }

  // ユーザー情報を取得
  const userInfo = await fetchUserInfo(request.userId)
  if (!userInfo) {
    throw new Error("ユーザー情報が見つかりません")
  }

  // Base64url encoding function that safely handles Unicode characters
  function base64urlEncode(str: string): string {
    const utf8Bytes = new TextEncoder().encode(str)
    let binaryStr = ""
    utf8Bytes.forEach((byte) => {
      binaryStr += String.fromCharCode(byte)
    })
    return btoa(binaryStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  // Generate salts for selective disclosure
  function generateSalt(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  // Create header
  const header = {
    alg: "ES256",
    typ: "vc+sd-jwt",
    kid: "university-issuer-key-2023",
  }

  // Prepare claims data
  const claimsData = prepareClaimsData(template, userInfo, request.customClaims)

  // Create disclosures for selective disclosure claims
  const disclosureArrays: [string, string, any][] = []
  const disclosures: string[] = []

  template.claims.forEach((claim) => {
    if (claim.selectiveDisclosure && claimsData[claim.key] !== undefined) {
      // Only include if claim is selected (if selectedClaims is provided)
      if (!request.selectedClaims || request.selectedClaims.includes(claim.key)) {
        const salt = generateSalt()
        const disclosureArray: [string, string, any] = [salt, claim.key, claimsData[claim.key]]
        disclosureArrays.push(disclosureArray)
        disclosures.push(base64urlEncode(JSON.stringify(disclosureArray)))
      }
    }
  })

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: template.issuer,
    sub: request.userId,
    iat: now,
    exp: now + template.validityPeriod * 24 * 60 * 60,
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: "7xbG-J0AQtpPArBOYNv1x9_JPvgBWGI40rZnwjNzTuc",
        y: "pBRgr0oi_I-C_zszVCT3XcCYTq8jar8XYRiUoEhUQ4Y",
      },
    },
    vc: {
      "@context": template.context,
      type: template.type,
      credentialSubject: {
        id: `did:example:${request.userId}`,
        // Include non-selective disclosure claims directly
        ...Object.fromEntries(
          template.claims
            .filter((claim) => !claim.selectiveDisclosure && claimsData[claim.key] !== undefined)
            .map((claim) => [claim.key, claimsData[claim.key]]),
        ),
      },
    },
    _sd: disclosures,
  }

  // Encode header and payload
  const encodedHeader = base64urlEncode(JSON.stringify(header))
  const encodedPayload = base64urlEncode(JSON.stringify(payload))

  // In a real implementation, sign the JWT with a private key
  const signature = "SIMULATED_SIGNATURE_FOR_DEMO_PURPOSES_ONLY"

  // Combine to form the SD-JWT
  const sdJwt = `${encodedHeader}.${encodedPayload}.${signature}~${disclosures.join("~")}`

  return sdJwt
}

function prepareClaimsData(
  template: EnhancedCredentialTemplate,
  userInfo: any,
  customClaims?: Record<string, any>,
): Record<string, any> {
  const claimsData: Record<string, any> = {}

  template.claims.forEach((claim) => {
    let value: any

    // Priority: customClaims > userInfo > defaultValue
    if (customClaims && customClaims[claim.key] !== undefined) {
      value = customClaims[claim.key]
    } else if (userInfo[claim.key] !== undefined) {
      value = userInfo[claim.key]
    } else if (claim.defaultValue !== undefined) {
      value = claim.defaultValue
    }

    // Handle VCM-specific field mappings
    if (value === undefined) {
      value = mapVCMFields(claim.key, userInfo)
    }

    // Type conversion
    if (value !== undefined) {
      switch (claim.type) {
        case "number":
          value = typeof value === "string" ? Number.parseFloat(value) : value
          break
        case "boolean":
          value = typeof value === "string" ? value === "true" : Boolean(value)
          break
        case "date":
          if (typeof value === "string") {
            value = new Date(value).toISOString()
          } else if (value instanceof Date) {
            value = value.toISOString()
          }
          break
        case "string":
        default:
          value = String(value)
          break
      }

      claimsData[claim.key] = value
    } else if (claim.required) {
      throw new Error(`必須クレーム '${claim.name}' の値が提供されていません`)
    }
  })

  return claimsData
}

function mapVCMFields(claimKey: string, userInfo: any): any {
  // Map VCM field names to local user info fields
  const fieldMappings: Record<string, string> = {
    fullName: "name",
    faculty: "department", // Map faculty to department for demo
    enrollmentYear: "enrollmentDate", // Will need conversion
    studentStatus: "status",
  }

  const mappedField = fieldMappings[claimKey]
  if (mappedField && userInfo[mappedField] !== undefined) {
    // Special handling for enrollmentYear
    if (claimKey === "enrollmentYear" && userInfo.enrollmentDate) {
      return new Date(userInfo.enrollmentDate).getFullYear()
    }
    return userInfo[mappedField]
  }

  return undefined
}

async function fetchUserInfo(userId: string): Promise<any> {
  // Demo user data with extended information for VCM compatibility
  const users: Record<string, any> = {
    "student-123": {
      name: "山田 太郎",
      fullName: "山田 太郎", // VCM field
      studentId: "S12345678",
      department: "工学部 情報工学科",
      faculty: "工学部", // VCM field
      email: "yamada@example.university.edu",
      status: "enrolled",
      studentStatus: "enrolled", // VCM field
      enrollmentDate: "2021-04-01",
      enrollmentYear: 2021, // VCM field
      expectedGraduation: "2025-03-31",
      gpa: 3.75,
      totalCredits: 98,
      academicYear: "4年生",
      major: "情報工学",
      degree: "学士（工学）",
      graduationDate: "2025-03-25",
      currentYear: "4年生",
      enrollmentStatus: "正規生",
      photoUrl: "https://example.com/photos/student-123.jpg", // VCM field
    },
  }

  return users[userId] || null
}

export { fetchUserInfo }
