import { NextResponse } from "next/server"

// グローバル型定義
declare global {
  var vcmConfig:
    | {
        enabled: boolean
        useMockData: boolean
        lastSync: string
        syncedTemplates: any[]
      }
    | undefined
}

export async function GET(request: Request) {
  try {
    console.log("API endpoint /api/well-known/openid-credential-issuer called")

    // リクエストのURLからベースURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    console.log("Base URL:", baseUrl)

    // 基本的なメタデータ構造
    const metadata = {
      issuer: baseUrl,
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      authorization_endpoint: `${baseUrl}/api/credential-issuer/authorize`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: {} as Record<string, any>,
    }

    // 静的テンプレートを追加
    console.log("Adding static templates...")

    // 静的テンプレートのマッピング
    const staticMapping: Record<string, string> = {
      "university-student-id": "UniversityStudentCredential",
      "academic-transcript": "AcademicTranscript",
      "graduation-certificate": "GraduationCertificate",
    }

    // 静的テンプレートを追加
    metadata.credential_configurations_supported["UniversityStudentCredential"] = {
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
        name: { display: [{ name: "氏名", locale: "ja-JP" }], mandatory: true },
        studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
        department: { display: [{ name: "所属", locale: "ja-JP" }], mandatory: false },
        status: { display: [{ name: "在籍状況", locale: "ja-JP" }], mandatory: false },
      },
    }

    metadata.credential_configurations_supported["AcademicTranscript"] = {
      format: "vc+sd-jwt",
      scope: "academic_transcript",
      cryptographic_binding_methods_supported: ["did"],
      credential_signing_alg_values_supported: ["ES256"],
      display: [
        {
          name: "成績証明書",
          locale: "ja-JP",
          background_color: "#059669",
          text_color: "#FFFFFF",
        },
      ],
      claims: {
        studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
        gpa: { display: [{ name: "GPA", locale: "ja-JP" }], mandatory: false },
        credits: { display: [{ name: "単位数", locale: "ja-JP" }], mandatory: false },
      },
    }

    metadata.credential_configurations_supported["GraduationCertificate"] = {
      format: "vc+sd-jwt",
      scope: "graduation_certificate",
      cryptographic_binding_methods_supported: ["did"],
      credential_signing_alg_values_supported: ["ES256"],
      display: [
        {
          name: "卒業証明書",
          locale: "ja-JP",
          background_color: "#7c3aed",
          text_color: "#FFFFFF",
        },
      ],
      claims: {
        studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }], mandatory: true },
        degree: { display: [{ name: "学位", locale: "ja-JP" }], mandatory: true },
        graduationDate: { display: [{ name: "卒業日", locale: "ja-JP" }], mandatory: true },
      },
    }

    // VCMテンプレートをglobalThisから取得
    console.log("Checking for VCM templates in global memory...")
    const vcmConfig = globalThis.vcmConfig
    console.log("VCM config from global memory:", vcmConfig ? "found" : "not found")

    if (vcmConfig && vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
      console.log(`Found ${vcmConfig.syncedTemplates.length} VCM templates in global memory`)
      console.log(
        "VCM templates:",
        vcmConfig.syncedTemplates.map((t) => t.id),
      )

      // VCMテンプレートを追加
      for (const template of vcmConfig.syncedTemplates) {
        try {
          console.log(`Processing VCM template: ${template.id}`)

          // クレームを変換
          const claims: Record<string, any> = {}
          if (template.claims && Array.isArray(template.claims)) {
            template.claims.forEach((claim: any) => {
              claims[claim.key] = {
                display: [{ name: claim.name, locale: "ja-JP" }],
                mandatory: claim.required || false,
              }
            })
          }

          // VCMテンプレートをOpenID4VCI形式に変換
          metadata.credential_configurations_supported[template.id] = {
            format: "vc+sd-jwt",
            scope: `${template.id}_credential`,
            cryptographic_binding_methods_supported: ["did"],
            credential_signing_alg_values_supported: ["ES256"],
            display: [
              {
                name: template.display?.name || template.name || template.id,
                locale: "ja-JP",
                background_color: template.display?.backgroundColor || template.backgroundColor || "#1e40af",
                text_color: template.display?.textColor || template.textColor || "#ffffff",
              },
            ],
            claims,
          }

          console.log(`Added VCM template configuration: ${template.id}`)
        } catch (templateError) {
          console.error(`Error processing VCM template ${template.id}:`, templateError)
        }
      }
    } else {
      console.log("No VCM templates found in global memory or invalid format")

      // デバッグ情報
      if (vcmConfig) {
        console.log("VCM config structure:", {
          enabled: vcmConfig.enabled,
          useMockData: vcmConfig.useMockData,
          lastSync: vcmConfig.lastSync,
          syncedTemplatesType: typeof vcmConfig.syncedTemplates,
          isArray: Array.isArray(vcmConfig.syncedTemplates),
          syncedTemplatesLength: vcmConfig.syncedTemplates?.length,
        })
      }

      // デフォルトのVCMテンプレートを追加
      console.log("Adding default VCM templates")

      const defaultVCMTemplates = [
        {
          id: "university-student-id-vcm",
          name: "大学学生証（VCM）",
          backgroundColor: "#2563eb",
          claims: [
            { key: "studentId", name: "学籍番号", required: true },
            { key: "fullName", name: "氏名", required: true },
            { key: "faculty", name: "学部", required: false },
            { key: "department", name: "学科", required: false },
            { key: "enrollmentYear", name: "入学年度", required: false },
            { key: "studentStatus", name: "在籍状況", required: false },
            { key: "email", name: "メールアドレス", required: false },
          ],
        },
        {
          id: "academic-transcript-vcm",
          name: "成績証明書（VCM）",
          backgroundColor: "#059669",
          claims: [
            { key: "studentId", name: "学籍番号", required: true },
            { key: "fullName", name: "氏名", required: true },
            { key: "gpa", name: "GPA", required: false },
            { key: "totalCredits", name: "取得単位数", required: false },
            { key: "academicYear", name: "学年", required: false },
            { key: "major", name: "専攻", required: false },
            { key: "graduationDate", name: "卒業予定日", required: false },
          ],
        },
        {
          id: "graduation-certificate-vcm",
          name: "卒業証明書（VCM）",
          backgroundColor: "#7c3aed",
          claims: [
            { key: "studentId", name: "学籍番号", required: true },
            { key: "fullName", name: "氏名", required: true },
            { key: "degree", name: "学位", required: true },
            { key: "major", name: "専攻", required: false },
            { key: "graduationDate", name: "卒業日", required: true },
            { key: "honors", name: "優等", required: false },
          ],
        },
      ]

      for (const template of defaultVCMTemplates) {
        const claims: Record<string, any> = {}
        template.claims.forEach((claim) => {
          claims[claim.key] = {
            display: [{ name: claim.name, locale: "ja-JP" }],
            mandatory: claim.required,
          }
        })

        metadata.credential_configurations_supported[template.id] = {
          format: "vc+sd-jwt",
          scope: `${template.id}_credential`,
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: template.name,
              locale: "ja-JP",
              background_color: template.backgroundColor,
              text_color: "#ffffff",
            },
          ],
          claims,
        }

        console.log(`Added default VCM template: ${template.id}`)
      }
    }

    console.log("Generated metadata with configurations:", Object.keys(metadata.credential_configurations_supported))

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error generating OpenID Credential Issuer metadata:", error)

    // エラーの場合は最小限のメタデータを返す
    const fallbackMetadata = {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: "/api/credential-issuer/credential",
      token_endpoint: "/api/credential-issuer/token",
      jwks_uri: "/api/credential-issuer/.well-known/jwks.json",
      credential_configurations_supported: {
        UniversityStudentCredential: {
          format: "vc+sd-jwt",
          scope: "student_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [{ name: "学生証明書", locale: "ja-JP" }],
          claims: {
            name: { display: [{ name: "氏名", locale: "ja-JP" }] },
            studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }] },
          },
        },
      },
    }

    return NextResponse.json(fallbackMetadata, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
