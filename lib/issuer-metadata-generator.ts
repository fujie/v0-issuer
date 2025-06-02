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

      // サーバーサイドでVCMデータが取得できなかった場合、環境変数から直接読み込む
      if (
        showVCM &&
        filteredTemplates.filter((t) => t.source === "vcm").length === 0 &&
        typeof global !== "undefined"
      ) {
        console.log("IssuerMetadataGenerator: No VCM templates found, trying to load from environment variable")

        try {
          // 環境変数からVCM設定を取得
          const vcmConfigStr = process.env.VCM_CONFIG
          if (vcmConfigStr) {
            console.log("IssuerMetadataGenerator: Found VCM_CONFIG environment variable")

            try {
              const vcmConfig = JSON.parse(vcmConfigStr)
              console.log("IssuerMetadataGenerator: Parsed VCM_CONFIG:", {
                enabled: vcmConfig.enabled,
                templatesCount: vcmConfig.syncedTemplates?.length || 0,
              })

              // グローバル変数に保存（サーバーサイドでのみ）
              if (typeof global !== "undefined" && !global.vcmConfig) {
                global.vcmConfig = vcmConfig
                console.log("IssuerMetadataGenerator: Saved VCM_CONFIG to global.vcmConfig")
              }

              // 同期されたテンプレートを処理
              if (vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
                for (const template of vcmConfig.syncedTemplates) {
                  try {
                    const enhancedTemplate: EnhancedCredentialTemplate = {
                      id: template.id,
                      name: template.name || template.id,
                      source: "vcm",
                      claims: template.claims || [],
                      display: {
                        name: template.name || template.id,
                        locale: "ja-JP",
                        backgroundColor: template.display?.backgroundColor || "#1e40af",
                        textColor: template.display?.textColor || "#ffffff",
                        logo: template.display?.logo,
                      },
                    }

                    const configuration = this.convertTemplateToConfiguration(enhancedTemplate)
                    issuerMetadata.credential_configurations_supported[template.id] = configuration
                    console.log(`IssuerMetadataGenerator: Added VCM configuration for ${template.id} from env var`)
                  } catch (error) {
                    console.error(`IssuerMetadataGenerator: Error converting VCM template ${template.id}:`, error)
                  }
                }
              }
            } catch (error) {
              console.error("IssuerMetadataGenerator: Error parsing VCM_CONFIG:", error)
            }
          } else {
            console.log("IssuerMetadataGenerator: No VCM_CONFIG environment variable found")
          }
        } catch (error) {
          console.error("IssuerMetadataGenerator: Error accessing environment variable:", error)
        }
      }

      // グローバルメモリからVCMデータを直接読み込む（サーバーサイドでのフォールバック）
      if (showVCM && filteredTemplates.filter((t) => t.source === "vcm").length === 0) {
        console.log("IssuerMetadataGenerator: Trying to load VCM data from global memory")

        // グローバル変数からVCM設定を取得
        let vcmConfig: any = null

        // Node.js環境（サーバーサイド）
        if (typeof global !== "undefined" && global.vcmConfig) {
          vcmConfig = global.vcmConfig
          console.log("IssuerMetadataGenerator: Found VCM config in global.vcmConfig")
        }
        // ブラウザ環境（クライアントサイド）
        else if (typeof globalThis !== "undefined" && globalThis.vcmConfig) {
          vcmConfig = globalThis.vcmConfig
          console.log("IssuerMetadataGenerator: Found VCM config in globalThis.vcmConfig")
        }

        if (vcmConfig && vcmConfig.syncedTemplates && Array.isArray(vcmConfig.syncedTemplates)) {
          console.log(
            `IssuerMetadataGenerator: Found ${vcmConfig.syncedTemplates.length} VCM templates in global memory`,
          )

          for (const template of vcmConfig.syncedTemplates) {
            try {
              const enhancedTemplate: EnhancedCredentialTemplate = {
                id: template.id,
                name: template.name || template.id,
                source: "vcm",
                claims: template.claims || [],
                display: {
                  name: template.name || template.id,
                  locale: "ja-JP",
                  backgroundColor: template.display?.backgroundColor || "#1e40af",
                  textColor: template.display?.textColor || "#ffffff",
                  logo: template.display?.logo,
                },
              }

              const configuration = this.convertTemplateToConfiguration(enhancedTemplate)
              issuerMetadata.credential_configurations_supported[template.id] = configuration
              console.log(`IssuerMetadataGenerator: Added VCM configuration for ${template.id} from global memory`)
            } catch (error) {
              console.error(`IssuerMetadataGenerator: Error converting VCM template ${template.id}:`, error)
            }
          }
        } else {
          console.log("IssuerMetadataGenerator: No VCM templates found in global memory")
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
