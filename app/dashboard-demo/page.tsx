"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Check, Download, Copy, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRCodeFallback } from "@/components/qr-code-fallback"

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
  const [error, setError] = useState<string | null>(null)
  const [credentialOffer, setCredentialOffer] = useState<string | null>(null)
  const [credentialOfferUri, setCredentialOfferUri] = useState<string | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)

  const handleIssue = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate OpenID4VCI credential issuance flow
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Generate SD-JWT according to OpenID4VCI
      // Base64url encoding function that safely handles Unicode characters
      function base64urlEncode(str) {
        // First convert the string to UTF-8
        const utf8Bytes = new TextEncoder().encode(str)
        // Convert bytes to binary string
        let binaryStr = ""
        utf8Bytes.forEach((byte) => {
          binaryStr += String.fromCharCode(byte)
        })
        // Base64 encode and make URL safe
        return btoa(binaryStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
      }

      // Generate salts for selective disclosure
      function generateSalt() {
        return Math.random().toString(36).substring(2, 15)
      }

      // Create header
      const header = {
        alg: "ES256",
        typ: "vc+sd-jwt",
        kid: "university-issuer-key-2023",
      }

      // Create disclosures with safe encoding
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      const salt3 = generateSalt()
      const salt4 = generateSalt()

      // Create disclosure arrays
      const disclosureArrays = [
        [salt1, "name", demoUser.name],
        [salt2, "studentId", demoUser.studentId],
        [salt3, "department", demoUser.department],
        [salt4, "status", "enrolled"],
      ]

      // Convert to JSON strings and encode
      const disclosures = disclosureArrays.map((arr) => base64urlEncode(JSON.stringify(arr)))

      // Create JWT payload according to OpenID4VCI
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        iss: "https://university-issuer.example.com",
        sub: demoUser.id,
        iat: now,
        exp: now + 30 * 24 * 60 * 60, // 30 days
        cnf: {
          jwk: {
            kty: "EC",
            crv: "P-256",
            x: "7xbG-J0AQtpPArBOYNv1x9_JPvgBWGI40rZnwjNzTuc",
            y: "pBRgr0oi_I-C_zszVCT3XcCYTq8jar8XYRiUoEhUQ4Y",
          },
        },
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "StudentCredential"],
          credentialSubject: {},
        },
        _sd: disclosures,
      }

      // Encode header and payload
      const encodedHeader = base64urlEncode(JSON.stringify(header))
      const encodedPayload = base64urlEncode(JSON.stringify(payload))

      // In a real implementation, sign the JWT
      // For demo purposes, we'll use a placeholder signature
      const signature = "SIMULATED_SIGNATURE_FOR_DEMO_PURPOSES_ONLY"

      // Combine to form the SD-JWT
      const sdJwt = `${encodedHeader}.${encodedPayload}.${signature}~${disclosures.join("~")}`

      setCredential(sdJwt)

      // Generate unique IDs
      const credentialOfferId = `offer_${Math.random().toString(36).substring(2, 15)}`
      const preAuthCode = `pre_auth_${Math.random().toString(36).substring(2, 15)}`

      // Create Credential Offer object according to OpenID4VCI ID2
      const credentialOfferObject = {
        credential_issuer: `${window.location.origin}/api/credential-issuer`,
        credential_configuration_ids: ["StudentCredential"],
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

      // Embed credential offer directly in QR code
      const credentialOfferJson = JSON.stringify(credentialOfferObject)
      const credentialOfferUriScheme = `openid-credential-offer://?credential_offer=${encodeURIComponent(credentialOfferJson)}`

      setCredentialOffer(JSON.stringify(credentialOfferObject, null, 2))
      setCredentialOfferUri(null)
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
    a.download = "student-credential.json"
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
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
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
              <CardTitle>学生証明書の発行</CardTitle>
              <CardDescription>OpenID4VCI ID2準拠のSD-JWT形式の学生証明書を発行できます</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">発行される証明書には以下の情報が含まれます：</p>
              <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                <li>氏名</li>
                <li>学籍番号</li>
                <li>所属学部/学科</li>
                <li>在籍状況</li>
                <li>発行日時</li>
              </ul>

              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                <p className="text-xs text-blue-700">
                  <strong>OpenID for Verifiable Credential Issuance Implementers Draft 2</strong> に準拠した
                  SD-JWT形式の証明書が発行されます。Credential Offerを使用してモバイルウォレットとの連携を行います。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleIssue} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    発行中...
                  </>
                ) : (
                  "学生証明書を発行する"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              証明書が発行されました
            </DialogTitle>
            <DialogDescription>OpenID4VCI ID2準拠のSD-JWT形式の学生証明書が正常に発行されました。</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="qrcode" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qrcode">QRコード</TabsTrigger>
              <TabsTrigger value="offer">Credential Offer</TabsTrigger>
              <TabsTrigger value="credential">証明書</TabsTrigger>
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
