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

export interface IssuerMetadata {
  credential_issuer: string
  authorization_server: string
  credential_endpoint: string
  token_endpoint: string
  jwks_uri: string
  credential_configurations_supported: Record<string, OpenID4VCICredentialConfiguration>
}

export interface ServerSyncStatus {
  hasSyncedData: boolean
  lastSync: string | null
  syncedTemplatesCount: number
  syncedTemplates: Array<{ id: string; name: string; source: string }>
}

export class IssuerMetadataGenerator {
  /**
   * Issuer Metadataを生成する
   * @param baseUrl ベースURL
   * @param options オプション
   * @returns Issuer Metadata
   */
  static async generateIssuerMetadata(
    baseUrl: string,
    options: {
      showVCM?: boolean
      showStatic?: boolean
      useServerSync?: boolean
    } = {},
  ): Promise<IssuerMetadata> {
    console.log("IssuerMetadataGenerator: Generating metadata for baseUrl:", baseUrl)
    const { showVCM = true, showStatic = true, useServerSync = true } = options

    try {
      // 基本的なメタデータ構造
      const issuerMetadata: IssuerMetadata = {
        credential_issuer: "https://university-issuer.example.com",
        authorization_server: "https://university-issuer.example.com",
        credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
        token_endpoint: `${baseUrl}/api/credential-issuer/token`,
        jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
        credential_configurations_supported: {},
      }

      // 全てのテンプレート（静的 + VCM）を取得
      const allTemplates = await CredentialTemplateManager.getAllTemplates(useServerSync)
      console.log("IssuerMetadataGenerator: Found templates:", allTemplates.length)

      // フィルタリングされたテンプレート
      const filteredTemplates = allTemplates.filter(
        (t) => (t.source === "vcm" && showVCM) || (t.source === "static" && showStatic),
      )

      // 各テンプレートをOpenID4VCI形式に変換
      for (const template of filteredTemplates) {
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

          issuerMetadata.credential_configurations_supported[configurationId] = configuration
          console.log(
            `IssuerMetadataGenerator: Added configuration for ${configurationId} (source: ${template.source})`,
          )
        } catch (error) {
          console.error(`IssuerMetadataGenerator: Error converting template ${template.id}:`, error)
        }
      }

      console.log(
        "IssuerMetadataGenerator: Generated metadata with configurations:",
        Object.keys(issuerMetadata.credential_configurations_supported),
      )
      return issuerMetadata
    } catch (error) {
      console.error("IssuerMetadataGenerator: Error generating metadata:", error)
      // フォールバック用の基本メタデータ
      return this.getDefaultMetadata(baseUrl)
    }
  }

  /**
   * テンプレートをOpenID4VCI形式に変換する
   * @param template テンプレート
   * @returns OpenID4VCI形式の設定
   */
  static convertTemplateToConfiguration(template: EnhancedCredentialTemplate): OpenID4VCICredentialConfiguration {
    console.log(`IssuerMetadataGenerator: Converting template ${template.id} to configuration`)

    // クレームをOpenID4VCI形式に変換
    const claims: Record<string, any> = {}

    if (Array.isArray(template.claims)) {
      template.claims.forEach((claim) => {
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
    } else {
      console.warn(`IssuerMetadataGenerator: Template ${template.id} has no claims array`)
    }

    const configuration: OpenID4VCICredentialConfiguration = {
      format: "vc+sd-jwt",
      scope: `${template.id}_credential`,
      cryptographic_binding_methods_supported: ["did"],
      credential_signing_alg_values_supported: ["ES256"],
      display: [
        {
          name: template.display?.name || template.id,
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

    console.log(`IssuerMetadataGenerator: Converted template ${template.id} with ${Object.keys(claims).length} claims`)
    return configuration
  }

  /**
   * サーバー同期状況を取得する
   * @returns サーバー同期状況
   */
  static async getServerSyncStatus(): Promise<ServerSyncStatus> {
    return await CredentialTemplateManager.getServerSyncStatus()
  }

  /**
   * デフォルトのメタデータを取得する
   * @param baseUrl ベースURL
   * @returns デフォルトのメタデータ
   */
  static getDefaultMetadata(baseUrl: string): IssuerMetadata {
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
