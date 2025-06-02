"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import QRCodeDisplay from "./qr-code-display"
import { Card, CardContent } from "@/components/ui/card"

interface IssueCredentialButtonProps {
  templateId: string
  studentInfo?: any
  claims?: Record<string, any>
  label?: string
}

function IssueCredentialButton({
  templateId,
  studentInfo,
  claims,
  label = "証明書を発行",
}: IssueCredentialButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [offerData, setOfferData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleIssueCredential = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/credential-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          studentInfo,
          claims,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setOfferData(data)
    } catch (err) {
      console.error("Failed to issue credential:", err)
      setError("証明書の発行に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleIssueCredential} disabled={isLoading}>
        {isLoading ? "処理中..." : label}
      </Button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {offerData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <h3 className="text-lg font-medium">証明書を受け取る</h3>
              <p className="text-sm text-gray-500 text-center">
                ウォレットアプリでQRコードをスキャンして証明書を受け取ってください
              </p>
              <QRCodeDisplay value={offerData.offerUri} size={200} />

              <details className="w-full">
                <summary className="cursor-pointer text-sm text-gray-500">詳細情報</summary>
                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(offerData, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 既存のデフォルトエクスポートを名前付きエクスポートに変更
export { IssueCredentialButton }

// デフォルトエクスポートも維持
export default IssueCredentialButton
