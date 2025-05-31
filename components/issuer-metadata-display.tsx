"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Copy, Check, RefreshCw } from "lucide-react"
import { CredentialTemplateManager, type EnhancedCredentialTemplate } from "@/lib/credential-templates-enhanced"

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

export function IssuerMetadataDisplay() {
  const [copied, setCopied] = useState(false)
  const [metadata, setMetadata] = useState<IssuerMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EnhancedCredentialTemplate[]>([])

  const generateMetadata = async () => {
    setLoading(true)
    try {
      console.log("IssuerMetadataDisplay: Generating metadata...")

      // 全てのテンプレート（静的 + VCM）を取得
      const allTemplates = await CredentialTemplateManager.getAllTemplates()
      console.log("IssuerMetadataDisplay: Found templates:", allTemplates.length)
      setTemplates(allTemplates)

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://example.com"

      // 基本的なメタデータ構造
      const issuerMetadata: IssuerMetadata = {
        credential_issuer: "https://university-issuer.example.com",
        authorization_server: "https://university-issuer.example.com",
        credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
        token_endpoint: `${baseUrl}/api/credential-issuer/token`,
        jwks_uri: `${baseUrl}/api/credential-issuer/.well-known/jwks.json`,
        credential_configurations_supported: {},
      }

      // 各テンプレートをOpenID4VCI形式に変換
      for (const template of allTemplates) {
        try {
          const configuration = convertTemplateToConfiguration(template)

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
          console.log(`IssuerMetadataDisplay: Added configuration for ${configurationId} (source: ${template.source})`)
        } catch (error) {
          console.error(`IssuerMetadataDisplay: Error converting template ${template.id}:`, error)
        }
      }

      console.log(
        "IssuerMetadataDisplay: Generated metadata with configurations:",
        Object.keys(issuerMetadata.credential_configurations_supported),
      )
      setMetadata(issuerMetadata)
    } catch (error) {
      console.error("IssuerMetadataDisplay: Error generating metadata:", error)
      // フォールバック用の基本メタデータ
      setMetadata(getDefaultMetadata())
    } finally {
      setLoading(false)
    }
  }

  const convertTemplateToConfiguration = (template: EnhancedCredentialTemplate): OpenID4VCICredentialConfiguration => {
    console.log(`IssuerMetadataDisplay: Converting template ${template.id} to configuration`)

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

    console.log(`IssuerMetadataDisplay: Converted template ${template.id} with ${Object.keys(claims).length} claims`)
    return configuration
  }

  const getDefaultMetadata = (): IssuerMetadata => {
    return {
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
  }

  useEffect(() => {
    generateMetadata()
  }, [])

  const copyToClipboard = () => {
    if (metadata) {
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const refreshMetadata = () => {
    generateMetadata()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issuer Metadata</CardTitle>
          <CardDescription>メタデータを生成中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metadata) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issuer Metadata</CardTitle>
          <CardDescription>メタデータの生成に失敗しました</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshMetadata}>再試行</Button>
        </CardContent>
      </Card>
    )
  }

  const configurationIds = Object.keys(metadata.credential_configurations_supported)
  const staticTemplates = templates.filter((t) => t.source === "static")
  const vcmTemplates = templates.filter((t) => t.source === "vcm")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issuer Metadata</CardTitle>
        <CardDescription>
          OpenID4VCI準拠のIssuer Metadata情報です。
          {staticTemplates.length}個の静的テンプレートと{vcmTemplates.length}個のVCMテンプレートが含まれています。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={refreshMetadata} className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            更新
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1">
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                JSONをコピー
              </>
            )}
          </Button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <h4 className="font-medium text-sm mb-2">含まれるCredential Configurations:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {configurationIds.map((id) => {
              const template = templates.find((t) =>
                t.source === "vcm"
                  ? t.id === id
                  : (t.id === "university-student-id" && id === "UniversityStudentCredential") ||
                    (t.id === "academic-transcript" && id === "AcademicTranscript") ||
                    (t.id === "graduation-certificate" && id === "GraduationCertificate"),
              )
              return (
                <div key={id} className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      template?.source === "vcm" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {template?.source === "vcm" ? "VCM" : "静的"}
                  </span>
                  <span className="font-mono">{id}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Tabs defaultValue="full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full">完全なメタデータ</TabsTrigger>
            <TabsTrigger value="configurations">Configurations のみ</TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="mt-4">
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="configurations" className="mt-4">
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
              {JSON.stringify(metadata.credential_configurations_supported, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
