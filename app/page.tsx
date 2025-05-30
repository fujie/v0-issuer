"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoIcon as InfoCircle } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/login")
      const data = await response.json()

      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl)
      } else {
        console.error("Login failed:", data.error || "Unknown error")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Login error:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">学生証明書発行システム</CardTitle>
            <CardDescription className="text-center">
              大学のアカウントでログインして学生証明書を発行できます
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                このシステムでは、SAMLプロトコルを使用して大学のIdentity Providerと連携し、
                OpenID4VCI準拠のSD-JWT形式で学生証明書を発行します。
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="flex items-start">
                <InfoCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <p className="text-sm text-blue-700">
                  デモモードでは、ログインボタンをクリックするとデモユーザーとして自動的に認証されます。
                  実際のシステムでは、大学のIdentity Providerにリダイレクトされます。
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <Link href="/verify" className="text-sm text-blue-600 hover:underline">
                SD-JWT検証ツールを使用する
              </Link>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
              {isLoading ? "ログイン中..." : "大学アカウントでログイン"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
