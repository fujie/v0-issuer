// テスト用のシンプルなメタデータエンドポイント（一時的）
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // もしtestパラメータがあれば、メタデータを返す
    if (body.test === "metadata") {
      const metadata = {
        issuer: "https://university-issuer.example.com",
        credential_endpoint: "/api/credential-issuer/credential",
        authorization_endpoint: "/api/credential-issuer/authorize",
        token_endpoint: "/api/credential-issuer/token",
        jwks_uri: "/api/credential-issuer/.well-known/jwks.json",
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
                background_color: "#12107c",
                text_color: "#FFFFFF",
              },
            ],
            claims: {
              name: { display: [{ name: "氏名", locale: "ja-JP" }] },
              studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }] },
              department: { display: [{ name: "所属", locale: "ja-JP" }] },
              status: { display: [{ name: "在籍状況", locale: "ja-JP" }] },
            },
          },
          "university-student-id-vcm": {
            format: "vc+sd-jwt",
            scope: "university_student_id_vcm_credential",
            cryptographic_binding_methods_supported: ["did"],
            credential_signing_alg_values_supported: ["ES256"],
            display: [
              {
                name: "大学学生証（VCM）",
                locale: "ja-JP",
                background_color: "#2563eb",
                text_color: "#ffffff",
              },
            ],
            claims: {
              studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
              fullName: { display: [{ name: "氏名", locale: "ja-JP" }], mandatory: true },
              faculty: { display: [{ name: "学部", locale: "ja-JP" }], mandatory: false },
              department: { display: [{ name: "学科", locale: "ja-JP" }], mandatory: false },
              enrollmentYear: { display: [{ name: "入学年度", locale: "ja-JP" }], mandatory: false },
              studentStatus: { display: [{ name: "在籍状況", locale: "ja-JP" }], mandatory: false },
              email: { display: [{ name: "メールアドレス", locale: "ja-JP" }], mandatory: false },
            },
          },
          "academic-transcript-vcm": {
            format: "vc+sd-jwt",
            scope: "academic_transcript_vcm_credential",
            cryptographic_binding_methods_supported: ["did"],
            credential_signing_alg_values_supported: ["ES256"],
            display: [
              {
                name: "成績証明書（VCM）",
                locale: "ja-JP",
                background_color: "#059669",
                text_color: "#ffffff",
              },
            ],
            claims: {
              studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
              fullName: { display: [{ name: "氏名", locale: "ja-JP" }], mandatory: true },
              gpa: { display: [{ name: "GPA", locale: "ja-JP" }], mandatory: false },
              totalCredits: { display: [{ name: "取得単位数", locale: "ja-JP" }], mandatory: false },
              academicYear: { display: [{ name: "学年", locale: "ja-JP" }], mandatory: false },
              major: { display: [{ name: "専攻", locale: "ja-JP" }], mandatory: false },
              graduationDate: { display: [{ name: "卒業予定日", locale: "ja-JP" }], mandatory: false },
            },
          },
          "graduation-certificate-vcm": {
            format: "vc+sd-jwt",
            scope: "graduation_certificate_vcm_credential",
            cryptographic_binding_methods_supported: ["did"],
            credential_signing_alg_values_supported: ["ES256"],
            display: [
              {
                name: "卒業証明書（VCM）",
                locale: "ja-JP",
                background_color: "#7c3aed",
                text_color: "#ffffff",
              },
            ],
            claims: {
              studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
              fullName: { display: [{ name: "氏名", locale: "ja-JP" }], mandatory: true },
              degree: { display: [{ name: "学位", locale: "ja-JP" }], mandatory: true },
              major: { display: [{ name: "専攻", locale: "ja-JP" }], mandatory: false },
              graduationDate: { display: [{ name: "卒業日", locale: "ja-JP" }], mandatory: true },
              honors: { display: [{ name: "優等", locale: "ja-JP" }], mandatory: false },
            },
          },
        },
      }

      return NextResponse.json(metadata, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      })
    }

    // 既存のコールバック処理を続行
    // ... 既存のコードはそのまま
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
