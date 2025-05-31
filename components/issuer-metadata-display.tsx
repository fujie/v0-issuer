"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Copy, Check, RefreshCw, FolderSyncIcon as Sync, AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CredentialTemplateManager, type EnhancedCredentialTemplate } from "@/lib/credential-templates-enhanced"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

interface ServerSyncStatus {
  hasSyncedData: boolean
  lastSync: string | null
  syncedTemplatesCount: number
  syncedTemplates: Array<{ id: string; name: string; source: string }>
}

export function IssuerMetadataDisplay() {
  const [copied, setCopied] = useState(false)
  const [metadata, setMetadata] = useState<IssuerMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EnhancedCredentialTemplate[]>([])
  const [showVCM, setShowVCM] = useState(true)
  const [showStatic, setShowStatic] = useState(true)
  const [serverSyncStatus, setServerSyncStatus] = useState<ServerSyncStatus | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [endpointStatus, setEndpointStatus] = useState<{
    loading: boolean
    success?: boolean
    message?: string
    data?: any
    error?: string
  }>({
    loading: false,
  })

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

      // フィルタリングされたテンプレート
      const filteredTemplates = allTemplates.filter(
        (t) => (t.source === "vcm" && showVCM) || (t.source === "static" && showStatic),
      )

      // 各テンプレートをOpenID4VCI形式に変換
      for (const template of filteredTemplates) {
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

  const loadServerSyncStatus = async () => {
    try {
      const status = await CredentialTemplateManager.getServerSyncStatus()
      setServerSyncStatus(status)
      console.log("Server sync status:", status)
    } catch (error) {
      console.error("Error loading server sync status:", error)
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
    loadServerSyncStatus()
  }, [showVCM, showStatic])

  const copyToClipboard = () => {
    if (metadata) {
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const refreshMetadata = () => {
    generateMetadata()
    loadServerSyncStatus()
  }

  const syncToServer = async () => {
    try {
      setSyncLoading(true)
      console.log("Manual sync to server...")
      const allTemplates = await CredentialTemplateManager.getAllTemplates()

      // VCMテンプレートの数を確認
      const vcmTemplates = allTemplates.filter((t) => t.source === "vcm")
      console.log(`Found ${vcmTemplates.length} VCM templates to sync`)

      if (vcmTemplates.length === 0) {
        alert("同期するVCMテンプレートがありません。先にVCMからテンプレートを同期してください。")
        setSyncLoading(false)
        return
      }

      const response = await fetch("/api/vcm/sync-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templates: allTemplates }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log("Manual server sync successful:", result)
        alert(`サーバー同期が完了しました。${result.syncedCount}個のテンプレートを同期しました。`)
      } else {
        console.error("Manual server sync failed:", response.status, result)
        alert(`サーバー同期に失敗しました: ${result.error || response.statusText}`)
      }

      await loadServerSyncStatus()
    } catch (error) {
      console.error("Error in manual sync:", error)
      alert(`同期エラー: ${error instanceof Error ? error.message : "不明なエラー"}`)
    } finally {
      setSyncLoading(false)
    }
  }

  const testEndpoint = async () => {
    setEndpointStatus({ loading: true })
    try {
      console.log("Testing /.well-known/openid-credential-issuer endpoint...")

      const response = await fetch("/api/well-known/openid-credential-issuer", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)

        setEndpointStatus({
          loading: false,
          success: false,
          message: `HTTP ${response.status}: エンドポイントが見つからないか、エラーが発生しました`,
          error: errorText,
          data: {
            status: response.status,
            statusText: response.statusText,
            body: errorText.substring(0, 500) + (errorText.length > 500 ? "..." : ""),
          },
        })
        return
      }

      const contentType = response.headers.get("content-type")
      console.log("Content-Type:", contentType)

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse.substring(0, 200))

        setEndpointStatus({
          loading: false,
          success: false,
          message: "エンドポイントからJSONではないレスポンスが返されました（おそらく404エラーページ）",
          error: textResponse,
          data: {
            contentType,
            body: textResponse.substring(0, 500) + (textResponse.length > 500 ? "..." : ""),
          },
        })
        return
      }

      const data = await response.json()
      console.log("Successfully parsed JSON response")

      // credential_configurations_supportedの数を確認
      const configCount = Object.keys(data.credential_configurations_supported || {}).length
      const vcmConfigCount = Object.keys(data.credential_configurations_supported || {}).filter((key) =>
        key.includes("-vcm"),
      ).length

      setEndpointStatus({
        loading: false,
        success: true,
        message: `エンドポイントから正常にメタデータを取得しました（${configCount}個のcredential configurations、うち${vcmConfigCount}個がVCM）`,
        data,
      })
    } catch (error) {
      console.error("Error testing endpoint:", error)

      let errorMessage = "不明なエラー"
      if (error instanceof Error) {
        if (error.message.includes("JSON")) {
          errorMessage = "レスポンスのJSONパースに失敗しました（HTMLページが返された可能性があります）"
        } else if (error.message.includes("fetch")) {
          errorMessage = "ネットワークエラーまたはエンドポイントにアクセスできません"
        } else {
          errorMessage = error.message
        }
      }

      setEndpointStatus({
        loading: false,
        success: false,
        message: `エラー: ${errorMessage}`,
        error: errorMessage,
      })
    }
  }

  const testAlternativeEndpoints = async () => {
    setEndpointStatus({ loading: true })

    const endpoints = [
      "/api/well-known/openid-credential-issuer",
      "/.well-known/openid-credential-issuer",
      "/api/credential-issuer/.well-known/openid-credential-issuer",
      "/api/credential-issuer/metadata",
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        if (response.ok) {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json()
            const configCount = Object.keys(data.credential_configurations_supported || {}).length
            const vcmConfigCount = Object.keys(data.credential_configurations_supported || {}).filter((key) =>
              key.includes("-vcm"),
            ).length

            setEndpointStatus({
              loading: false,
              success: true,
              message: `${endpoint} から正常にメタデータを取得しました（${configCount}個のcredential configurations、うち${vcmConfigCount}個がVCM）`,
              data,
            })
            return
          }
        }
      } catch (error) {
        console.log(`Failed to test ${endpoint}:`, error)
      }
    }

    setEndpointStatus({
      loading: false,
      success: false,
      message: "すべてのエンドポイントでメタデータの取得に失敗しました",
      error: "すべてのエンドポイントでメタデータの取得に失敗しました",
    })
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
          {showStatic && staticTemplates.length > 0 && `${staticTemplates.length}個の静的テンプレート`}
          {showStatic && showVCM && staticTemplates.length > 0 && vcmTemplates.length > 0 && "と"}
          {showVCM && vcmTemplates.length > 0 && `${vcmTemplates.length}個のVCMテンプレート`}
          が含まれています。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch id="show-vcm" checked={showVCM} onCheckedChange={setShowVCM} />
                <Label htmlFor="show-vcm">VCMテンプレート</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="show-static" checked={showStatic} onCheckedChange={setShowStatic} />
                <Label htmlFor="show-static">静的テンプレート</Label>
              </div>
            </div>
            <div className="flex gap-2">
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
          </div>

          {/* サーバー同期状況 */}
          <div className="mb-4 p-3 bg-yellow-50 rounded-md">
            <h4 className="font-medium text-sm mb-2">サーバー同期状況</h4>
            {serverSyncStatus ? (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      serverSyncStatus.hasSyncedData ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {serverSyncStatus.hasSyncedData ? "同期済み" : "未同期"}
                  </span>
                  <span>{serverSyncStatus.syncedTemplatesCount}個のテンプレートが同期されています</span>
                </div>
                {serverSyncStatus.lastSync && (
                  <div>最終同期: {new Date(serverSyncStatus.lastSync).toLocaleString("ja-JP")}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncToServer}
                    disabled={syncLoading}
                    className="flex items-center gap-1"
                  >
                    <Sync className="h-4 w-4" />
                    {syncLoading ? "同期中..." : "手動同期"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">同期状況を読み込み中...</div>
            )}
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

          <div className="mb-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={testEndpoint} disabled={endpointStatus.loading}>
              {endpointStatus.loading ? "テスト中..." : "標準エンドポイントをテスト"}
            </Button>
            <Button variant="outline" size="sm" onClick={testAlternativeEndpoints} disabled={endpointStatus.loading}>
              {endpointStatus.loading ? "テスト中..." : "代替エンドポイントをテスト"}
            </Button>
          </div>

          {endpointStatus.message && (
            <div
              className={`mt-2 p-2 rounded text-sm ${
                endpointStatus.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {endpointStatus.message}
              {endpointStatus.data && (
                <div className="mt-2">
                  <details>
                    <summary className="cursor-pointer font-medium">エンドポイントのレスポンス</summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded-md overflow-auto max-h-40 text-xs">
                      {JSON.stringify(endpointStatus.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {endpointStatus.error && !endpointStatus.success && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>エンドポイントエラー</AlertTitle>
              <AlertDescription>
                <p>エンドポイントへのアクセスに問題があります。以下の点を確認してください：</p>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li>Next.jsの設定でドットで始まるパスが許可されているか</li>
                  <li>サーバー同期が正常に完了しているか</li>
                  <li>VCMテンプレートが存在するか</li>
                </ul>
                <p className="mt-2 text-sm">
                  <strong>ヒント：</strong> まず「手動同期」ボタンを押してVCMテンプレートをサーバーに同期してから、
                  「代替エンドポイントをテスト」ボタンを押してください。
                </p>
              </AlertDescription>
            </Alert>
          )}
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
