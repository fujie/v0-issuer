import { type NextRequest, NextResponse } from "next/server"

// CORSヘッダーを定義
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
}

export async function GET(request: NextRequest) {
  console.log("=== Issuer Metadata Request ===")

  try {
    // リクエストURLからbaseURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    console.log("Base URL:", baseUrl)

    // 基本的なメタデータを直接生成（ServerMetadataGeneratorを使わずに）
    const metadata = {
      credential_issuer: baseUrl,
      authorization_server: baseUrl,
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: {
        StudentCredential: {
          format: "vc+sd-jwt",
          scope: "student_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "学生証明書",
              locale: "ja-JP",
              background_color: "#1e40af",
              text_color: "#ffffff",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
              mandatory: true,
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
              mandatory: true,
            },
            department: {
              display: [{ name: "所属", locale: "ja-JP" }],
              mandatory: false,
            },
            status: {
              display: [{ name: "在籍状況", locale: "ja-JP" }],
              mandatory: false,
            },
          },
        },
        "student-credential": {
          format: "vc+sd-jwt",
          scope: "student_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "学生証明書",
              locale: "ja-JP",
              background_color: "#1e40af",
              text_color: "#ffffff",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
              mandatory: true,
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
              mandatory: true,
            },
            department: {
              display: [{ name: "所属学部・学科", locale: "ja-JP" }],
              mandatory: true,
            },
            status: {
              display: [{ name: "在籍状況", locale: "ja-JP" }],
              mandatory: true,
            },
            enrollmentDate: {
              display: [{ name: "入学年月日", locale: "ja-JP" }],
              mandatory: false,
            },
            expectedGraduation: {
              display: [{ name: "卒業予定年月", locale: "ja-JP" }],
              mandatory: false,
            },
          },
        },
        "academic-transcript": {
          format: "vc+sd-jwt",
          scope: "academic_transcript_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "成績証明書",
              locale: "ja-JP",
              background_color: "#059669",
              text_color: "#ffffff",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
              mandatory: true,
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
              mandatory: true,
            },
            gpa: {
              display: [{ name: "GPA", locale: "ja-JP" }],
              mandatory: true,
            },
            totalCredits: {
              display: [{ name: "取得単位数", locale: "ja-JP" }],
              mandatory: true,
            },
            academicYear: {
              display: [{ name: "学年", locale: "ja-JP" }],
              mandatory: true,
            },
            major: {
              display: [{ name: "専攻", locale: "ja-JP" }],
              mandatory: true,
            },
          },
        },
        "graduation-certificate": {
          format: "vc+sd-jwt",
          scope: "graduation_certificate_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "卒業証明書",
              locale: "ja-JP",
              background_color: "#7c2d12",
              text_color: "#ffffff",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
              mandatory: true,
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
              mandatory: true,
            },
            degree: {
              display: [{ name: "学位", locale: "ja-JP" }],
              mandatory: true,
            },
            major: {
              display: [{ name: "専攻", locale: "ja-JP" }],
              mandatory: true,
            },
            graduationDate: {
              display: [{ name: "卒業年月日", locale: "ja-JP" }],
              mandatory: true,
            },
            honors: {
              display: [{ name: "優等学位", locale: "ja-JP" }],
              mandatory: false,
            },
          },
        },
        "enrollment-certificate": {
          format: "vc+sd-jwt",
          scope: "enrollment_certificate_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "在学証明書",
              locale: "ja-JP",
              background_color: "#7c3aed",
              text_color: "#ffffff",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
              mandatory: true,
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
              mandatory: true,
            },
            currentYear: {
              display: [{ name: "現在の学年", locale: "ja-JP" }],
              mandatory: true,
            },
            enrollmentStatus: {
              display: [{ name: "在籍区分", locale: "ja-JP" }],
              mandatory: true,
            },
            expectedGraduation: {
              display: [{ name: "卒業予定年月", locale: "ja-JP" }],
              mandatory: true,
            },
          },
        },
      },
    }

    console.log("Generated metadata successfully")
    console.log("Supported configurations:", Object.keys(metadata.credential_configurations_supported))

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error("=== Issuer Metadata Error ===")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "server_error",
        error_description: `An error occurred generating issuer metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: error instanceof Error ? error.stack : "No additional details",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}
