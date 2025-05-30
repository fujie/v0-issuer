"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function IdpLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [samlRequest, setSamlRequest] = useState("")
  const [relayState, setRelayState] = useState("")
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドでのみURLパラメータを取得
  useEffect(() => {
    setIsClient(true)

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      setSamlRequest(searchParams.get("SAMLRequest") || "")
      setRelayState(searchParams.get("RelayState") || "")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // ダミーの認証（実際のアプリケーションでは適切に認証）
    if (username === "student" && password === "password") {
      // SAMLレスポンスを生成
      const samlResponse = await generateSAMLResponse(username)

      // フォームを作成して自動送信
      if (typeof window !== "undefined") {
        const form = document.createElement("form")
        form.method = "POST"
        form.action = relayState || "/api/auth/callback"

        const samlInput = document.createElement("input")
        samlInput.type = "hidden"
        samlInput.name = "SAMLResponse"
        samlInput.value = samlResponse

        form.appendChild(samlInput)
        document.body.appendChild(form)
        form.submit()
      }
    } else {
      setError("ユーザー名またはパスワードが正しくありません")
    }
  }

  // クライアントサイドでレンダリングされるまで何も表示しない
  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-blue-50 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-blue-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">大学認証システム</CardTitle>
            <CardDescription className="text-center">大学のアカウントでログインしてください</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ユーザー名を入力"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                ログイン
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-xs text-gray-500 text-center">
              デモ用アカウント: ユーザー名 "student", パスワード "password"
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

async function generateSAMLResponse(username: string): Promise<string> {
  // ダミーのSAMLレスポンスを生成
  const id = `_${Math.random().toString(36).substring(2, 10)}`
  const issueInstant = new Date().toISOString()
  const notBefore = new Date()
  const notOnOrAfter = new Date()
  notOnOrAfter.setMinutes(notOnOrAfter.getMinutes() + 5)

  const samlResponse = `
    <samlp:Response
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${id}"
      Version="2.0"
      IssueInstant="${issueInstant}"
      Destination="http://localhost:3000/api/auth/callback">
      <saml:Issuer>http://localhost:3001</saml:Issuer>
      <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" />
      </samlp:Status>
      <saml:Assertion
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}_assertion"
        Version="2.0"
        IssueInstant="${issueInstant}">
        <saml:Issuer>http://localhost:3001</saml:Issuer>
        <saml:Subject>
          <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
            ${username}@example.university.edu
          </saml:NameID>
          <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
            <saml:SubjectConfirmationData
              NotOnOrAfter="${notOnOrAfter.toISOString()}"
              Recipient="http://localhost:3000/api/auth/callback" />
          </saml:SubjectConfirmation>
        </saml:Subject>
        <saml:Conditions
          NotBefore="${notBefore.toISOString()}"
          NotOnOrAfter="${notOnOrAfter.toISOString()}">
          <saml:AudienceRestriction>
            <saml:Audience>http://localhost:3000</saml:Audience>
          </saml:AudienceRestriction>
        </saml:Conditions>
        <saml:AuthnStatement
          AuthnInstant="${issueInstant}"
          SessionIndex="${id}_session">
          <saml:AuthnContext>
            <saml:AuthnContextClassRef>
              urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
            </saml:AuthnContextClassRef>
          </saml:AuthnContext>
        </saml:AuthnStatement>
        <saml:AttributeStatement>
          <saml:Attribute Name="urn:oid:2.5.4.42" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
            <saml:AttributeValue>山田 太郎</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="urn:oid:0.9.2342.19200300.100.1.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
            <saml:AttributeValue>${username}@example.university.edu</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="urn:oid:1.3.6.1.4.1.5923.1.1.1.7" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
            <saml:AttributeValue>S12345678</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="urn:oid:1.3.6.1.4.1.5923.1.1.1.2" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
            <saml:AttributeValue>工学部 情報工学科</saml:AttributeValue>
          </saml:Attribute>
        </saml:AttributeStatement>
      </saml:Assertion>
    </samlp:Response>
  `

  // 実際のアプリケーションではSAMLレスポンスを署名する
  return Buffer.from(samlResponse).toString("base64")
}
