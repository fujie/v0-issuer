"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import QRCodeDisplay from "./qr-code-display"

// OpenID4VCI 1.0準拠のCredential Offer生成関数
function generateCredentialOffer(baseUrl: string, templateId: string) {
  // Credential Offerを生成
  const credentialOffer = {
    credential_issuer: `${baseUrl}/api/credential-issuer`,
    credential_configuration_ids: [templateId],
    grants: {
      // OpenID4VCI 1.0仕様に準拠: authorization_codeグラントを削除
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": `pre_auth_${Math.random().toString(36).substring(2, 15)}`,
        // OpenID4VCI 1.0仕様: user_pin_requiredを削除、tx_codeも省略（PINコード不要）
      },
    },
  }

  return credentialOffer
}

export default function CredentialOfferGenerator() {
  const [templateId, setTemplateId] = useState("enrollment-certificate")
  const [offerData, setOfferData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateOffer = async () => {
    setIsLoading(true)
    try {
      const baseUrl = window.location.origin

      // サーバーサイドでCredential Offerを生成
      const response = await fetch("/api/credential-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
        }),
      })

      const data = await response.json()
      setOfferData(data)
    } catch (error) {
      console.error("Error generating credential offer:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>証明書発行オファー生成</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template">証明書テンプレート</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="template">
              <SelectValue placeholder="テンプレートを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enrollment-certificate">在学証明書</SelectItem>
              <SelectItem value="graduation-certificate">卒業証明書</SelectItem>
              <SelectItem value="academic-transcript">成績証明書</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerateOffer} disabled={isLoading} className="w-full">
          {isLoading ? "生成中..." : "オファー生成"}
        </Button>

        {offerData && (
          <div className="space-y-4 mt-4">
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-medium mb-2">Credential Offer</h3>
              <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(offerData.offer, null, 2)}</pre>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="font-medium mb-2">QRコード</h3>
              <QRCodeDisplay value={offerData.offerUri} size={200} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
