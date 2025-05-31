"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CredentialTemplateSelectorEnhanced } from "./credential-template-selector-enhanced"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

interface IssueCredentialButtonProps {
  userId: string
}

export function IssueCredentialButton({ userId }: IssueCredentialButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    credentialOffer?: any
    error?: string
  } | null>(null)

  const handleTemplateSelect = async (templateId: string, selectedClaims: string[]) => {
    console.log("Issuing credential with template:", templateId)
    console.log("Selected claims:", selectedClaims)
    console.log("User ID:", userId)

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/credential-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          templateId,
          selectedClaims,
        }),
      })

      const data = await response.json()
      console.log("Credential offer response:", data)

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: "証明書が正常に発行されました",
          credentialOffer: data.credentialOffer,
        })
      } else {
        setResult({
          success: false,
          message: data.message || "証明書の発行に失敗しました",
          error: data.error,
        })
      }
    } catch (error) {
      console.error("Credential issuance error:", error)
      setResult({
        success: false,
        message: "証明書の発行中にエラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setResult(null)
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">証明書を発行</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>証明書の発行</DialogTitle>
          <DialogDescription>発行する証明書のテンプレートを選択し、開示する情報を設定してください。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                <div>
                  <p>{result.message}</p>
                  {result.error && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">エラー詳細</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">{result.error}</pre>
                    </details>
                  )}
                  {result.credentialOffer && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">発行された証明書情報</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.credentialOffer, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!result && (
            <CredentialTemplateSelectorEnhanced onTemplateSelect={handleTemplateSelect} isLoading={isLoading} />
          )}

          {result && (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                閉じる
              </Button>
              {result.success && (
                <Button
                  onClick={() => {
                    setResult(null)
                    setIsLoading(false)
                  }}
                >
                  別の証明書を発行
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
