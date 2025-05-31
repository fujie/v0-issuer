import { NextResponse } from "next/server"

// In-memory storage for demo purposes
const credentialOffers: Record<string, any> = {}
const preAuthCodes: Record<string, any> = {}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { templateId, claims, studentInfo } = data

    if (!templateId) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing template ID" }, { status: 400 })
    }

    console.log("Creating credential offer for template:", templateId)
    console.log("Student info:", studentInfo)
    console.log("Claims:", claims)

    // テンプレートIDからcredential_configuration_idを決定
    let credentialConfigurationId: string

    // VCMテンプレートかどうかを判定（IDに"-vcm"が含まれている場合）
    if (templateId.includes("-vcm")) {
      credentialConfigurationId = templateId
    } else {
      // 静的テンプレートのマッピング
      const staticMapping: Record<string, string> = {
        "university-student-id": "StudentCredential",
        "academic-transcript": "AcademicTranscript",
        "graduation-certificate": "GraduationCertificate",
      }
      credentialConfigurationId = staticMapping[templateId] || "StudentCredential"
    }

    console.log("Using credential configuration ID:", credentialConfigurationId)

    // Offer IDを生成
    const offerId = `offer_${Math.random().toString(36).substring(2, 15)}`
    const preAuthCode = `pre_auth_${Math.random().toString(36).substring(2, 15)}`

    // リクエストのベースURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Credential Offerを作成
    const offer = {
      credential_issuer: baseUrl,
      credential_configuration_ids: [credentialConfigurationId],
      grants: {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": preAuthCode,
          user_pin_required: false,
        },
      },
    }

    // Offerを保存（学生情報とテンプレート情報を含める）
    credentialOffers[offerId] = offer
    preAuthCodes[preAuthCode] = {
      templateId,
      credentialConfigurationId,
      claims: claims || {},
      studentInfo: studentInfo || getDefaultStudentInfo(),
      expiresAt: Date.now() + 600000, // 10分
      createdAt: Date.now(),
    }

    console.log("Credential offer created:", offerId)
    console.log("Pre-auth code data:", preAuthCodes[preAuthCode])

    return NextResponse.json({
      success: true,
      offerId,
      offer,
      preAuthCode, // デバッグ用に返却
      offerUri: `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
        `${baseUrl}/api/credential-offers/${offerId}`,
      )}`,
    })
  } catch (error) {
    console.error("Store credential offer error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
  }
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

// Export the storage for other routes to access
export { credentialOffers, preAuthCodes }
