"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Download, Copy, ExternalLink, Bug, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRCodeFallback } from "@/components/qr-code-fallback"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CredentialTemplateSelectorEnhanced } from "@/components/credential-template-selector-enhanced"
import { issueCredentialFromTemplate } from "@/lib/credential-service-enhanced"
import { CredentialTemplateManager } from "@/lib/credential-templates-enhanced"
import Link from "next/link"

// Demo user data
const demoUser = {
  id: "student-123",
  name: "山田 太郎",
  email: "student@example.university.edu",
  studentId: "S12345678",
  department: "工学部 情報工学科",
}

export default function DashboardDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [credential, setCredential] = useState<string | null>(null)
  const [credentialDebugInfo, setCredentialDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [credentialOffer, setCredentialOffer] = useState<string | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  const handleTemplateSelect = async (templateId: string, selectedClaims: string[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const template = await CredentialTemplateManager.getTemplate(templateId)
      if (!template) {
        throw new Error("テンプレートが見つかりません")
      }

      setSelectedTemplate(template)

      // Issue credential using the enhanced service
      const sdJwt = await issueCredentialFromTemplate({
        templateId,
        userId: demoUser.id,
        selectedClaims,
      })

      setCredential(sdJwt)

      // Parse the SD-JWT for debug info
      const [jwt, ...disclosures] = sdJwt.split("~")
      const [headerB64, payloadB64, signature] = jwt.split(".")

      function decodeBase64url(str: string) {
        const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
        const binaryString = atob(padded)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const utf8String = new TextDecoder("utf-8").decode(bytes)
        return JSON.parse(utf8String)
      }

      const header = decodeBase64url(headerB64)
      const payload = decodeBase64url(payloadB64)

      const decodedDisclosures = disclosures.map((disclosure) => {
        try {
          return decodeBase64url(disclosure)
        } catch (e) {
          return ["デコード失敗", "無効な開示値"]
        }
      })

      // Create debug info
      const debugInfo = {
        template,
        selectedClaims,
        header,
        payload,
        disclosures: decodedDisclosures,
        encodedHeader: headerB64,
        encodedPayload: payloadB64,
        signature,
        sdJwtParts: {
          jwt: `${headerB64}.${payloadB64}.${signature}`,
          disclosures: disclosures,
        },
        verifiableCredential: {
          "@context": payload.vc["@context"],
          type: payload.vc.type,
          issuer: payload.iss,
          issuanceDate: new Date(payload.iat * 1000).toISOString(),
          expirationDate: new Date(payload.exp * 1000).toISOString(),
          credentialSubject: {
            id: `did:example:${payload.sub}`,
            ...payload.vc.credentialSubject,
            // Add disclosed claims
            ...Object.fromEntries(
              decodedDisclosures.filter((d) => Array.isArray(d) && d.length >= 3).map((d) => [d[1], d[2]]),
            ),
          },
          proof: {
            type: "JsonWebSignature2020",
            created: new Date(payload.iat * 1000).toISOString(),
            verificationMethod: `${payload.iss}#${header.kid}`,
            proofPurpose: "assertionMethod",
            jws: `${headerB64}..${signature}`,
          },
        },
        selectiveDisclosure: {
          totalClaims: decodedDisclosures.length,
          disclosableClaims: decodedDisclosures.map((arr, index) => ({
            salt: Array.isArray(arr) ? arr[0] : "unknown",
            claim: Array.isArray(arr) ? arr[1] : "unknown",
            value: Array.isArray(arr) ? arr[2] : "unknown",
            disclosure: disclosures[index],
          })),
        },
      }

      setCredentialDebugInfo(debugInfo)

      // Generate Credential Offer
      const credentialOfferId = `offer_${Math.random().toString(36).substring(2, 15)}`
      const preAuthCode = `pre_auth_${Math.random().toString(36).substring(2, 15)}`

      const credentialOfferObject = {
        credential_issuer: `${window.location.origin}/api/credential-issuer`,
        credential_configuration_ids: [template.id],
        grants: {
          authorization_code: {
            issuer_state: `state_${Math.random().toString(36).substring(2, 10)}`,
          },
          "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
            "pre-authorized_code": preAuthCode,
            user_pin_required: false,
          },
        },
      }

      const credentialOfferJson = JSON.stringify(credentialOfferObject)
      const credentialOfferUriScheme = `openid-credential-offer://?credential_offer=${encodeURIComponent(credentialOfferJson)}`

      setCredentialOffer(JSON.stringify(credentialOfferObject, null, 2))
      setQrCodeData(credentialOfferUriScheme)

      setIsOpen(true)
    } catch (err) {
      console.error("Credential issuance error:", err)
      setError(err instanceof Error ? err.message : "証明書の発行に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!credential) return

    const blob = new Blob([credential], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedTemplate?.name || "credential"}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyQRData = async () => {
    if (!qrCodeData) return

    try {
      await navigator.clipboard.writeText(qrCodeData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleTestCredentialOffer = () => {
    if (!qrCodeData) return
    setShowTestDialog(true)
  }

  const handleLogout = () => {
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <header className="container mx-auto py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">学生証明書発行システム</h1>
          <div className="flex space-x-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                管理
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 py-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー情報</CardTitle>
              <CardDescription>SAMLプロバイダから取得した情報</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">名前</dt>
                  <dd className="mt-1 text-sm text-gray-900">{demoUser.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900">{demoUser.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">学籍番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{demoUser.studentId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">所属</dt>
                  <dd className="mt-1 text-sm text-gray-900">{demoUser.department}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">認証状態</dt>
                  <dd className="mt-1">
                    <Badge variant="success" className="bg-green-100 text-green-800">
                      認証済み
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>証明書の発行</CardTitle>
              <CardDescription>
                ローカルテンプレートとVerifiable Credential
                Managerで定義されたテンプレートから証明書を選択して発行できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CredentialTemplateSelectorEnhanced onTemplateSelect={handleTemplateSelect} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </main>

      {error && (
        <div className="container mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              {selectedTemplate?.display.name}が発行されました
            </DialogTitle>
            <DialogDescription>OpenID4VCI ID2準拠のSD-JWT形式の証明書が正常に発行されました。</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="qrcode" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="qrcode">QRコード</TabsTrigger>
              <TabsTrigger value="offer">Credential Offer</TabsTrigger>
              <TabsTrigger value="credential">証明書</TabsTrigger>
              <TabsTrigger value="debug">
                <Bug className="h-4 w-4 mr-1" />
                デバッグ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qrcode" className="mt-4">
              <div className="flex justify-center p-4 bg-white rounded-md">
                {qrCodeData && (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex justify-center mb-4">
                      <QRCodeFallback data={qrCodeData} size={200} />
                    </div>

                    <div className="w-full space-y-3">
                      <p className="text-xs text-gray-500 text-center">
                        QRコードをスキャンしてCredential Offerを受け取り、ウォレットで証明書を取得
                      </p>

                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-700">Credential Offer URI:</p>
                          <Button variant="outline" size="sm" onClick={handleCopyQRData} className="h-6 px-2 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? "コピー済み" : "コピー"}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600 break-all">{qrCodeData}</p>
                      </div>

                      <div className="bg-green-50 p-3 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-green-700">Credential Offer テスト:</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestCredentialOffer}
                            className="h-6 px-2 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            表示
                          </Button>
                        </div>
                        <p className="text-xs text-green-600">
                          テストボタンをクリックしてCredential Offerの内容を確認できます。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="offer" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Credential Offer (OpenID4VCI ID2準拠)</h4>
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                    <pre className="text-xs">{credentialOffer}</pre>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-2">
                  <p>
                    <strong>credential_issuer:</strong> 証明書発行者のエンドポイント
                  </p>
                  <p>
                    <strong>credential_configuration_ids:</strong> 発行可能な証明書の設定ID
                  </p>
                  <p>
                    <strong>grants:</strong> 利用可能な認可フロー（認可コードフロー、事前認可コードフロー）
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credential" className="mt-4">
              <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                <pre className="text-xs">{credential}</pre>
              </div>
              <div className="mt-4">
                <Button onClick={handleDownload} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  証明書をダウンロード
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="debug" className="mt-4">
              {credentialDebugInfo && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <div className="flex items-start">
                      <Bug className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">デバッグ情報</h3>
                        <p className="text-xs text-yellow-700 mt-1">
                          開発・検証用の詳細情報です。本番環境では表示されません。
                        </p>
                      </div>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="template-info">
                      <AccordionTrigger>使用されたテンプレート情報</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2">
                              テンプレート: {credentialDebugInfo.template.display.name}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">{credentialDebugInfo.template.description}</p>
                            <div className="text-xs space-y-1">
                              <p>
                                <strong>ID:</strong> {credentialDebugInfo.template.id}
                              </p>
                              <p>
                                <strong>ソース:</strong>{" "}
                                {credentialDebugInfo.template.source === "vcm" ? "VCM" : "ローカル"}
                              </p>
                              <p>
                                <strong>有効期限:</strong> {credentialDebugInfo.template.validityPeriod}日
                              </p>
                              <p>
                                <strong>発行者:</strong> {credentialDebugInfo.template.issuer}
                              </p>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2">選択された開示項目</h4>
                            <div className="flex flex-wrap gap-1">
                              {credentialDebugInfo.selectedClaims.map((claim: string) => (
                                <Badge key={claim} variant="outline" className="text-xs">
                                  {credentialDebugInfo.template.claims.find((c: any) => c.key === claim)?.name || claim}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="verifiable-credential">
                      <AccordionTrigger>Verifiable Credential 構造</AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-80">
                          <pre className="text-xs">
                            {JSON.stringify(credentialDebugInfo.verifiableCredential, null, 2)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="jwt-header">
                      <AccordionTrigger>JWT ヘッダー</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <div className="bg-gray-50 p-4 rounded-md">
                            <pre className="text-xs">{JSON.stringify(credentialDebugInfo.header, null, 2)}</pre>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>
                              <strong>エンコード済み:</strong> {credentialDebugInfo.encodedHeader}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="jwt-payload">
                      <AccordionTrigger>JWT ペイロード</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                            <pre className="text-xs">{JSON.stringify(credentialDebugInfo.payload, null, 2)}</pre>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>
                              <strong>エンコード済み:</strong> {credentialDebugInfo.encodedPayload}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="selective-disclosure">
                      <AccordionTrigger>選択的開示情報</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="text-sm">
                              <strong>開示可能なクレーム数:</strong>{" "}
                              {credentialDebugInfo.selectiveDisclosure.totalClaims}
                            </div>
                            {credentialDebugInfo.selectiveDisclosure.disclosableClaims.map(
                              (item: any, index: number) => (
                                <div key={index} className="border rounded-md p-3 bg-gray-50">
                                  <div className="grid grid-cols-1 gap-2 text-xs">
                                    <div>
                                      <strong>クレーム:</strong> {item.claim}
                                    </div>
                                    <div>
                                      <strong>値:</strong> {item.value}
                                    </div>
                                    <div>
                                      <strong>ソルト:</strong> {item.salt}
                                    </div>
                                    <div>
                                      <strong>開示値:</strong>{" "}
                                      <code className="bg-white px-1 rounded">{item.disclosure}</code>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="sd-jwt-structure">
                      <AccordionTrigger>SD-JWT 構造</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">JWT部分</h4>
                            <div className="bg-gray-50 p-3 rounded-md">
                              <code className="text-xs break-all">{credentialDebugInfo.sdJwtParts.jwt}</code>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">開示値部分</h4>
                            <div className="space-y-2">
                              {credentialDebugInfo.sdJwtParts.disclosures.map((disclosure: string, index: number) => (
                                <div key={index} className="bg-gray-50 p-2 rounded-md">
                                  <div className="text-xs text-gray-600 mb-1">開示値 {index + 1}:</div>
                                  <code className="text-xs break-all">{disclosure}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">署名</h4>
                            <div className="bg-gray-50 p-3 rounded-md">
                              <code className="text-xs break-all">{credentialDebugInfo.signature}</code>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">※ デモ用の模擬署名です</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credential Offer Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credential Offer テスト</DialogTitle>
            <DialogDescription>
              これはCredential Offerの内容です。実際のウォレットアプリでは、このデータを使用して証明書を取得します。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap">{credentialOffer}</pre>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            <p>
              <strong>注意:</strong> 実際のウォレットアプリでは、QRコードをスキャンしてCredential
              Offerを取得し、OpenID4VCI認証フローを開始します。
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
