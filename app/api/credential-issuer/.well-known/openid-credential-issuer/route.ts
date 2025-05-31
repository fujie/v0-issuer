import { NextResponse } from "next/server"
import { credentialTemplates } from "@/lib/credential-templates"

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

// 完全なCORSヘッダーを定義
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization, User-Agent, Cache-Control",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "Content-Length, Content-Type",
  Vary: "Origin",
}

interface OpenID4VCICredentialConfiguration {
  format: string
  scope?: string
  cryptographic_binding_methods_supported: string[]
  credential_signing_alg_values_supported: string[]
  display: Array<{
    name: string
    locale: string
    logo?: {
      url: string
      alt_text: string
    }
    background_color: string
    text_color: string
  }>
  claims: Record<
    string,
    {
      display: Array<{
        name: string
        locale: string
      }>
      mandatory?: boolean
    }
  >
}

interface IssuerMetadata {
  credential_issuer: string
  authorization_server: string
  credential_endpoint: string
  token_endpoint: string
  jwks_uri: string
  credential_configurations_supported: Record<string, OpenID4VCICredentialConfiguration>
}

function convertTemplateToConfiguration(template: any): OpenID4VCICredentialConfiguration {
  console.log(`Converting template ${template.id} to configuration`)

  // クレームをOpenID4VCI形式に変換
  const claims: Record<string, any> = {}

  template.claims.forEach((claim: any) => {
    claims[claim.key] = {
      display: [
        {
          name: claim.name,
          locale: template.display?.locale || "ja-JP",
        },
      ],
      mandatory: claim.required,
    }
  })

  const configuration: OpenID4VCICredentialConfiguration = {
    format: "vc+sd-jwt",
    scope: `${template.id}_credential`,
    cryptographic_binding_methods_supported: ["did"],
    credential_signing_alg_values_supported: ["ES256"],
    display: [
      {
        name: template.display?.name || template.name,
        locale: template.display?.locale || "ja-JP",
        background_color: template.display?.backgroundColor || "#1e40af",
        text_color: template.display?.textColor || "#ffffff",
        ...(template.display?.logo && {
          logo: {
            url: template.display.logo.url || "",
            alt_text: template.display.logo.alt_text || template.display.name,
          },
        }),
      },
    ],
    claims,
  }

  console.log(`Converted template ${template.id} with ${Object.keys(claims).length} claims`)
  return configuration
}

// OPTIONSリクエストを処理する関数
export async function OPTIONS() {
  console.log("OPTIONS request received for OpenID Credential Issuer metadata")

  return new Response(null, {
    status: 204, // No Content
    headers: corsHeaders,
  })
}

export async function GET(request: Request) {
  try {
    console.log("OpenID Credential Issuer metadata endpoint called")
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://university-issuer.example.com"

    // 基本的なメタデータ構造
    const issuerMetadata: IssuerMetadata = {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: {},
    }

    // 静的テンプレートを追加
    console.log("Adding static templates...")
    const staticMapping: Record<string, string> = {
      "university-student-id": "UniversityStudentCredential",
      "academic-transcript": "AcademicTranscript",
      "graduation-certificate": "GraduationCertificate",
    }

    credentialTemplates.forEach((template) => {
      try {
        const configurationId = staticMapping[template.id] || template.id
        const configuration = convertTemplateToConfiguration({
          ...template,
          source: "static",
        })
        issuerMetadata.credential_configurations_supported[configurationId] = configuration
        console.log(`Added static configuration: ${configurationId}`)
      } catch (error) {
        console.error(`Error converting static template ${template.id}:`, error)
      }
    })

    // VCMテンプレートをglobalThisから取得して追加
    console.log("Checking for VCM templates in global memory...")
    const vcmConfig = globalThis.vcmConfig

    if (vcmConfig && vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
      console.log(`Found ${vcmConfig.syncedTemplates.length} VCM templates in global memory`)

      vcmConfig.syncedTemplates.forEach((template: any) => {
        try {
          // VCMテンプレートはIDをそのまま使用
          const configurationId = template.id
          const configuration = convertTemplateToConfiguration(template)
          issuerMetadata.credential_configurations_supported[configurationId] = configuration
          console.log(`Added VCM configuration: ${configurationId}`)
        } catch (error) {
          console.error(`Error converting VCM template ${template.id}:`, error)
        }
      })
    } else {
      console.log("No VCM templates found in global memory")
    }

    const totalConfigurations = Object.keys(issuerMetadata.credential_configurations_supported).length
    console.log(`Generated metadata with ${totalConfigurations} credential configurations`)

    // CORSヘッダーを含めたレスポンスを返す
    return NextResponse.json(issuerMetadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error("Error generating OpenID Credential Issuer metadata:", error)

    // フォールバック用の基本メタデータ
    const fallbackMetadata: IssuerMetadata = {
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
        },
      },
    }

    return NextResponse.json(fallbackMetadata, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }
}
