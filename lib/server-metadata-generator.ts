import { credentialTemplates } from "./credential-templates"
import type { EnhancedCredentialTemplate } from "./credential-templates-enhanced"

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

export class ServerMetadataGenerator {
  static generateIssuerMetadata(baseUrl: string): IssuerMetadata {
    console.log("ServerMetadataGenerator: Generating metadata for baseUrl:", baseUrl)

    // 基本的なメタデータ構造
    const metadata: IssuerMetadata = {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: {},
    }

    try {
      // 静的テンプレートを追加
      const staticTemplates = credentialTemplates.map((template) => ({
        ...template,
        source: "static" as const,
      }))

      // VCMテンプレートを環境変数から取得（もしあれば）
      const vcmTemplates = this.getVCMTemplatesFromEnv()

      // 全テンプレートを結合
      const allTemplates = [...staticTemplates, ...vcmTemplates]

      console.log("ServerMetadataGenerator: Processing templates:", allTemplates.length)

      // 各テンプレートをOpenID4VCI形式に変換
      for (const template of allTemplates) {
        try {
          const configuration = this.convertTemplateToConfiguration(template)

          // VCMテンプレートの場合はIDをそのまま使用、静的テンプレートの場合はマッピング
          let configurationId: string
          if (template.source === "vcm") {
            configurationId = template.id
          } else {
            // 静的テンプレートのマッピング
            const staticMapping: Record<string, string> = {
              "university-student-id": "UniversityStudentCredential",
              "academic-transcript": "AcademicTranscript",
              "graduation-certificate": "GraduationCertificate",
            }
            configurationId = staticMapping[template.id] || template.id
          }

          metadata.credential_configurations_supported[configurationId] = configuration
          console.log(
            `ServerMetadataGenerator: Added configuration for ${configurationId} (source: ${template.source})`,
          )
        } catch (error) {
          console.error(`ServerMetadataGenerator: Error converting template ${template.id}:`, error)
        }
      }

      // VCMテンプレートが環境変数にない場合は、デフォルトのVCMテンプレートを追加
      if (vcmTemplates.length === 0) {
        this.addDefaultVCMTemplates(metadata)
      }

      console.log(
        "ServerMetadataGenerator: Generated metadata with configurations:",
        Object.keys(metadata.credential_configurations_supported),
      )
      return metadata
    } catch (error) {
      console.error("ServerMetadataGenerator: Error generating metadata:", error)
      // エラーの場合はフォールバック用の基本設定を返す
      return this.getDefaultMetadata(baseUrl)
    }
  }

  private static getVCMTemplatesFromEnv(): EnhancedCredentialTemplate[] {
    try {
      const vcmConfigStr = process.env.VCM_CONFIG
      if (!vcmConfigStr) {
        console.log("ServerMetadataGenerator: No VCM_CONFIG environment variable found")
        return []
      }

      const vcmConfig = JSON.parse(vcmConfigStr)
      if (vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
        console.log("ServerMetadataGenerator: Found VCM templates in env:", vcmConfig.syncedTemplates.length)
        return vcmConfig.syncedTemplates
      }

      return []
    } catch (error) {
      console.error("ServerMetadataGenerator: Error parsing VCM_CONFIG:", error)
      return []
    }
  }

  private static addDefaultVCMTemplates(metadata: IssuerMetadata): void {
    console.log("ServerMetadataGenerator: Adding default VCM templates")

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
    }
  }

  private static convertTemplateToConfiguration(
    template: EnhancedCredentialTemplate,
  ): OpenID4VCICredentialConfiguration {
    console.log(`ServerMetadataGenerator: Converting template ${template.id} to configuration`)

    // クレームをOpenID4VCI形式に変換
    const claims: Record<string, any> = {}

    template.claims.forEach((claim) => {
      claims[claim.key] = {
        display: [
          {
            name: claim.name,
            locale: template.display.locale || "ja-JP",
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
          name: template.display.name,
          locale: template.display.locale || "ja-JP",
          background_color: template.display.backgroundColor || "#1e40af",
          text_color: template.display.textColor || "#ffffff",
          ...(template.display.logo && {
            logo: {
              url: template.display.logo.url || "",
              alt_text: template.display.logo.alt_text || template.display.name,
            },
          }),
        },
      ],
      claims,
    }

    console.log(`ServerMetadataGenerator: Converted template ${template.id} with ${Object.keys(claims).length} claims`)
    return configuration
  }

  private static getDefaultMetadata(baseUrl: string): IssuerMetadata {
    return {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
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
  }
}
