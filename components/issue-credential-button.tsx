"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { issueCredential } from "@/lib/credential-service"
import { Loader2, Check, Download } from "lucide-react"

interface IssueCredentialButtonProps {
  userId: string
}

export function IssueCredentialButton({ userId }: IssueCredentialButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [credential, setCredential] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleIssue = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await issueCredential(userId)
      setCredential(result)
      setIsOpen(true)
    } catch (err) {
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

  return (
    <>
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

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              証明書が発行されました
            </DialogTitle>
            <DialogDescription>
              SD-JWT形式の学生証明書が正常に発行されました。ダウンロードして保存してください。
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
            <pre className="text-xs">{credential}</pre>
          </div>

          <DialogFooter>
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              証明書をダウンロード
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
