import { CredentialTemplateManager, type EnhancedCredentialTemplate } from "./credential-templates-enhanced"

export interface OpenID4VCICredentialConfiguration {
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

export interface OpenID4VCIIssuerMetadata {
  issuer: string
  credential_endpoint: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  credential_configurations_supported: Record<string, OpenID4VCICredentialConfiguration>
}

export class OpenID4VCIMetadataGenerator {
  static async generateIssuerMetadata(baseUrl: string): Promise<OpenID4VCIIssuerMetadata> {
    console.log("OpenID4VCIMetadataGenerator: Generating issuer metadata for baseUrl:", baseUrl)

    // 基本的なメタデータ構造
    const metadata: OpenID4VCIIssuerMetadata = {
      issuer: "https://university-issuer.example.com",
      credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
      authorization_endpoint: `${baseUrl}/api/credential-issuer/authorize`,
      token_endpoint: `${baseUrl}/api/credential-issuer/token`,
      jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
      credential_configurations_supported: {},
    }

    try {
      // 全てのテンプレート（静的 + VCM）を取得
      const allTemplates = await CredentialTemplateManager.getAllTemplates()
      console.log("OpenID4VCIMetadataGenerator: Found templates:", allTemplates.length)

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
              "university-student-id": "StudentCredential",
              "academic-transcript": "AcademicTranscript",
              "graduation-certificate": "GraduationCertificate",
            }
            configurationId = staticMapping[template.id] || template.id
          }

          metadata.credential_configurations_supported[configurationId] = configuration
          console.log(
            `OpenID4VCIMetadataGenerator: Added configuration for ${configurationId} (source: ${template.source})`,
          )
        } catch (error) {
          console.error(`OpenID4VCIMetadataGenerator: Error converting template ${template.id}:`, error)
        }
      }

      console.log(
        "OpenID4VCIMetadataGenerator: Generated metadata with configurations:",
        Object.keys(metadata.credential_configurations_supported),
      )
      return metadata
    } catch (error) {
      console.error("OpenID4VCIMetadataGenerator: Error generating metadata:", error)

      // エラーの場合はフォールバック用の基本設定を返す
      metadata.credential_configurations_supported = {
        StudentCredential: this.getDefaultStudentCredentialConfiguration(),
      }

      return metadata
    }
  }

  private static convertTemplateToConfiguration(
    template: EnhancedCredentialTemplate,
  ): OpenID4VCICredentialConfiguration {
    console.log(`OpenID4VCIMetadataGenerator: Converting template ${template.id} to configuration`)

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

    console.log(
      `OpenID4VCIMetadataGenerator: Converted template ${template.id} with ${Object.keys(claims).length} claims`,
    )
    return configuration
  }

  private static getDefaultStudentCredentialConfiguration(): OpenID4VCICredentialConfiguration {
    return {
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
        name: {
          display: [
            {
              name: "氏名",
              locale: "ja-JP",
            },
          ],
          mandatory: true,
        },
        studentId: {
          display: [
            {
              name: "学籍番号",
              locale: "ja-JP",
            },
          ],
          mandatory: true,
        },
        department: {
          display: [
            {
              name: "所属",
              locale: "ja-JP",
            },
          ],
          mandatory: false,
        },
        status: {
          display: [
            {
              name: "在籍状況",
              locale: "ja-JP",
            },
          ],
          mandatory: false,
        },
      },
    }
  }
}
