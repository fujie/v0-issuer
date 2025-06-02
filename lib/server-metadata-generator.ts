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

    try {
      // 基本的なメタデータ構造
      const metadata: IssuerMetadata = {
        credential_issuer: baseUrl,
        authorization_server: baseUrl,
        credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
        token_endpoint: `${baseUrl}/api/credential-issuer/token`,
        jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
        credential_configurations_supported: {},
      }

      // 静的なテンプレート設定を直接追加
      this.addStaticTemplates(metadata)

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

  private static addStaticTemplates(metadata: IssuerMetadata): void {
    console.log("ServerMetadataGenerator: Adding static templates")

    const staticTemplates = [
      {
        id: "StudentCredential",
        name: "学生証明書",
        backgroundColor: "#1e40af",
        claims: [
          { key: "name", name: "氏名", required: true },
          { key: "studentId", name: "学籍番号", required: true },
          { key: "department", name: "所属", required: false },
          { key: "status", name: "在籍状況", required: false },
        ],
      },
      {
        id: "student-credential",
        name: "学生証明書",
        backgroundColor: "#1e40af",
        claims: [
          { key: "name", name: "氏名", required: true },
          { key: "studentId", name: "学籍番号", required: true },
          { key: "department", name: "所属学部・学科", required: true },
          { key: "status", name: "在籍状況", required: true },
          { key: "enrollmentDate", name: "入学年月日", required: false },
          { key: "expectedGraduation", name: "卒業予定年月", required: false },
        ],
      },
      {
        id: "academic-transcript",
        name: "成績証明書",
        backgroundColor: "#059669",
        claims: [
          { key: "name", name: "氏名", required: true },
          { key: "studentId", name: "学籍番号", required: true },
          { key: "gpa", name: "GPA", required: true },
          { key: "totalCredits", name: "取得単位数", required: true },
          { key: "academicYear", name: "学年", required: true },
          { key: "major", name: "専攻", required: true },
        ],
      },
      {
        id: "graduation-certificate",
        name: "卒業証明書",
        backgroundColor: "#7c2d12",
        claims: [
          { key: "name", name: "氏名", required: true },
          { key: "studentId", name: "学籍番号", required: true },
          { key: "degree", name: "学位", required: true },
          { key: "major", name: "専攻", required: true },
          { key: "graduationDate", name: "卒業年月日", required: true },
          { key: "honors", name: "優等学位", required: false },
        ],
      },
      {
        id: "enrollment-certificate",
        name: "在学証明書",
        backgroundColor: "#7c3aed",
        claims: [
          { key: "name", name: "氏名", required: true },
          { key: "studentId", name: "学籍番号", required: true },
          { key: "currentYear", name: "現在の学年", required: true },
          { key: "enrollmentStatus", name: "在籍区分", required: true },
          { key: "expectedGraduation", name: "卒業予定年月", required: true },
        ],
      },
    ]

    for (const template of staticTemplates) {
      try {
        const claims: Record<string, any> = {}
        template.claims.forEach((claim) => {
          claims[claim.key] = {
            display: [{ name: claim.name, locale: "ja-JP" }],
            mandatory: claim.required,
          }
        })

        metadata.credential_configurations_supported[template.id] = {
          format: "vc+sd-jwt",
          scope: `${template.id.replace(/-/g, "_")}_credential`,
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

        console.log(`ServerMetadataGenerator: Added template ${template.id}`)
      } catch (error) {
        console.error(`ServerMetadataGenerator: Error adding template ${template.id}:`, error)
      }
    }
  }

  private static getDefaultMetadata(baseUrl: string): IssuerMetadata {
    console.log("ServerMetadataGenerator: Using default metadata")

    return {
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
