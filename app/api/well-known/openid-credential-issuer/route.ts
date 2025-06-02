import { type NextRequest, NextResponse } from "next/server"

// CORSヘッダーを定義
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
}

// 静的なクレデンシャル設定
const getStaticCredentialConfigurations = () => {
  return {
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
  }
}

// VCMから同期されたクレデンシャル設定を取得
const getVCMCredentialConfigurations = () => {
  try {
    console.log("=== VCM Credential Configurations ===")

    // 環境変数からVCM設定を取得
    const vcmConfigStr = process.env.VCM_CONFIG
    if (!vcmConfigStr) {
      console.log("No VCM_CONFIG environment variable found")
      return {}
    }

    console.log("Found VCM_CONFIG environment variable")

    let vcmConfig
    try {
      vcmConfig = JSON.parse(vcmConfigStr)
      console.log("Parsed VCM_CONFIG successfully")
    } catch (parseError) {
      console.error("Error parsing VCM_CONFIG JSON:", parseError)
      return {}
    }

    if (!vcmConfig.syncedTemplates || !Array.isArray(vcmConfig.syncedTemplates)) {
      console.log("No syncedTemplates found in VCM_CONFIG")
      return {}
    }

    console.log("Found synced templates:", vcmConfig.syncedTemplates.length)

    const vcmConfigurations: Record<string, any> = {}

    for (const template of vcmConfig.syncedTemplates) {
      try {
        console.log(`Processing VCM template: ${template.id}`)

        // クレームをOpenID4VCI形式に変換
        const claims: Record<string, any> = {}
        if (Array.isArray(template.claims)) {
          template.claims.forEach((claim: any) => {
            claims[claim.key] = {
              display: [
                {
                  name: claim.name,
                  locale: template.display?.locale || "ja-JP",
                },
              ],
              mandatory: claim.required || false,
            }
          })
        }

        vcmConfigurations[template.id] = {
          format: "vc+sd-jwt",
          scope: `${template.id.replace(/-/g, "_")}_credential`,
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: template.display?.name || template.name || template.id,
              locale: template.display?.locale || "ja-JP",
              background_color: template.display?.backgroundColor || "#1e40af",
              text_color: template.display?.textColor || "#ffffff",
              ...(template.display?.logo && {
                logo: {
                  url: template.display.logo.url || "",
                  alt_text: template.display.logo.alt_text || template.display?.name || template.id,
                },
              }),
            },
          ],
          claims,
        }

        console.log(`Added VCM configuration: ${template.id}`)
      } catch (templateError) {
        console.error(`Error processing VCM template ${template.id}:`, templateError)
      }
    }

    console.log("VCM configurations processed:", Object.keys(vcmConfigurations).length)
    return vcmConfigurations
  } catch (error) {
    console.error("Error getting VCM credential configurations:", error)
    return {}
  }
}

export async function GET(request: NextRequest) {
  console.log("=== Issuer Metadata Request ===")

  try {
    // リクエストURLからbaseURLを取得
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    console.log("Base URL:", baseUrl)

    // 静的なクレデンシャル設定を取得
    const staticConfigurations = getStaticCredentialConfigurations()
    console.log("Static configurations loaded:", Object.keys(staticConfigurations).length)

    // VCMから同期されたクレデンシャル設定を取得
    const vcmConfigurations = getVCMCredentialConfigurations()
    console.log("VCM configurations loaded:", Object.keys(vcmConfigurations).length)

    // 設定を結合（VCMが優先）
    const allConfigurations = {
      ...staticConfigurations,
      ...vcmConfigurations,
    }

    console.log("Total configurations:", Object.keys(allConfigurations).length)
    console.log("Configuration IDs:", Object.keys(allConfigurations))

    // メタデータを生成
    const metadata = {
      credential_issuer: baseUrl,
      authorization_server: baseUrl,
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: allConfigurations,
    }

    console.log("Generated metadata successfully")
    console.log("Final supported configurations:", Object.keys(metadata.credential_configurations_supported))

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error("=== Issuer Metadata Error ===")
    console.error("Error type:", typeof error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    // 最小限のフォールバックメタデータ
    const fallbackMetadata = {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: "https://university-issuer.example.com/api/credential-issuer/credential",
      token_endpoint: "https://university-issuer.example.com/api/credential-issuer/token",
      jwks_uri: "https://university-issuer.example.com/api/credential-issuer/.well-known/jwks.json",
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
          },
        },
      },
    }

    console.log("Returning fallback metadata")

    return NextResponse.json(fallbackMetadata, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}
