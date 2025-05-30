"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import { SdJwtDecoder } from "@/components/sd-jwt-decoder"

export default function VerifyPage() {
  const [sdJwt, setSdJwt] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          setSdJwt(content.trim())
        } catch (err) {
          setError("ファイルの読み込みに失敗しました。有効なJSONファイルを選択してください。")
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleVerify = async () => {
    if (!sdJwt.trim()) {
      setError("SD-JWTを入力してください。")
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      // SD-JWTの解析
      const result = await parseAndVerifySdJwt(sdJwt)
      setVerificationResult(result)
    } catch (err) {
      console.error("Verification error:", err)
      setError(err instanceof Error ? err.message : "SD-JWTの検証に失敗しました。")
      setVerificationResult(null)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClear = () => {
    setSdJwt("")
    setFile(null)
    setVerificationResult(null)
    setError(null)
  }

  const handleSampleData = () => {
    // サンプルのSD-JWT
    const sampleSdJwt = `eyJhbGciOiJFUzI1NiIsInR5cCI6InZjK3NkLWp3dCIsImtpZCI6InVuaXZlcnNpdHktaXNzdWVyLWtleS0yMDIzIn0.eyJpc3MiOiJodHRwczovL3VuaXZlcnNpdHktaXNzdWVyLmV4YW1wbGUuY29tIiwic3ViIjoic3R1ZGVudC0xMjMiLCJpYXQiOjE3MTY5NTk2NTAsImV4cCI6MTcxOTU1MTY1MCwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Ijd4YkctSjBBUXRwUEFyQk9ZTnYxeDlfSlB2Z0JXR0k0MHJabndqTnpUdWMiLCJ5IjoicEJSZ3Iwb2lfSS1DX3pzelZDVDNYY0NZVHE4amFyOFhZUmlVb0VoVVE0WSJ9fSwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIlN0dWRlbnRDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7fX0sIl9zZCI6WyJleUpoYkdjaU9pSkZVekkxTmlJc0luUjVjQ0k2SW5aaktITmtMV3AzZENJc0ltdHBaQ0k2SW5WdWFYWmxjbk5wZEhrdGFYTnpkV1Z5TFd0bGVTMHlNREl6SW4wLmV5SnBjM01pT2lKb2RIUndjem92TDNWdWFYWmxjbk5wZEhrdGFYTnpkV1Z5TG1WNFlXMXdiR1V1WTI5dElpd2ljM1ZpSWpvaWMzUjFaR1Z1ZEMweE1qTWlMQ0pwWVhRaU9qRTNNVFk1TlRrMk5UQXNJbVY0Y0NJNk1UY3hPVFUxTVRZMU1Dd2lZMjVtSWpwN0ltcDNheUk2ZXlKcmRIa2lPaUpGUXlJc0ltTnlkaUk2SWxBdE1qVTJJaXdpZUNJNklqZDRZa2N0U2pCQlVYUndVRUZ5UWs5WlRuWXhlRmxmU2xCMlowSldSMGswTUhKYWJuZHFUbnBVZFdNaUxDSjVJam9pY0VKU1ozSXdhV2xmU1MxRFgzcHplbFpEVkROWVkwTlpWSEU0YW1GeU9GaFpVbWxWYjBWb1ZVUTBXU0o5ZlN3aWRtTWlPbnNpUUdOdmJuUmxlSFFpT2xzaWFIUjBjSE02THk5M2QzY3Vkek11YjNKbkx6SXdNVGd2WTNKbFpHVnVkR2xoYkhNdmRqRWlYU3dpZEhsd1pTSTZXeUpXWlhKcFptbGhZbXhsUTNKbFpHVnVkR2xoYkNJc0lsTjBkV1JsYm5SRGNtVmtaVzUwYVdGc0lsMHNJbU55WldSbGJuUnBZV3hUZFdKcVpXTjBJanA3ZlgxOSIsImV5SmhiR2NpT2lKRlV6STFOaUlzSW5SNWNDSTZJblpqSzNOa0xXcDNkQ0lzSW10cFpDSTZJblZ1YVhabGNuTnBkSGt0YVhOemRXVnlMbVY0WVcxd2JHVXVZMjl0SWl3aWMzVmlJam9pYzNSMVpHVnVkQzB4TWpNaUxDSnBZWFFpT2pFM01UWTVOVGsyTlRBc0ltVjRjQ0k2TVRjeE9UVTFNVFkxTUN3aVkyNW1JanA3SW1wM2F5STZleUpyZEhraU9pSkZReUlzSW1OeWRpSTZJbEF0TWpVMklpd2llQ0k2SWpkNFlrY3RTakJCVVhSd1VFRnlRazlaVG5ZeGVGbGZTbEIyWjBKV1IwazBNSEphYm5kcVRucFVkV01pTENKNUlqb2ljRUpTWjNJd2FXbGZTUzFEWDNwemVsWkRWRE5ZWTBOWlZIRTRhbUZ5T0ZoWlVtbFZiMFZvVlVRMFdTSjlmU3dpZG1NaU9uc2lRR052Ym5SbGVIUWlPbHNpYUhSMGNITTZMeTkzZDNjdWR6TXViM0puTHpJd01UZ3ZZM0psWkdWdWRHbGhiSE12ZGpFaVhTd2lkSGx3WlNJNld5SldaWEpwWm1saFlteGxRM0psWkdWdWRHbGhiQ0lzSWxOMGRXUmxiblJEY21Wa1pXNTBhV0ZzSWwwc0ltTnlaV1JsYm5ScFlXeFRkV0pxWldOMElqcDdmWDE5IiwiZXlKaGJHY2lPaUpGVXpJMU5pSXNJblI1Y0NJNkluWmpLM05rTFdwM2RDSXNJbXRwWkNJNkluVnVhWFpsY25OcGRIa3RhWE56ZFdWeUxXdGxlUzB5TURJeklpd2lZV3huSWpvaVJWTXlOVFlpZlEuZXlKcGMzTWlPaUpvZEhSd2N6b3ZMM1Z1YVhabGNuTnBkSGt0YVhOemRXVnlMbVY0WVcxd2JHVXVZMjl0SWl3aWMzVmlJam9pYzNSMVpHVnVkQzB4TWpNaUxDSnBZWFFpT2pFM01UWTVOVGsyTlRBc0ltVjRjQ0k2TVRjeE9UVTFNVFkxTUN3aVkyNW1JanA3SW1wM2F5STZleUpyZEhraU9pSkZReUlzSW1OeWRpSTZJbEF0TWpVMklpd2llQ0k2SWpkNFlrY3RTakJCVVhSd1VFRnlRazlaVG5ZeGVGbGZTbEIyWjBKV1IwazBNSEphYm5kcVRucFVkV01pTENKNUlqb2ljRUpTWjNJd2FXbGZTUzFEWDNwemVsWkRWRE5ZWTBOWlZIRTRhbUZ5T0ZoWlVtbFZiMFZvVlVRMFdTSjlmU3dpZG1NaU9uc2lRR052Ym5SbGVIUWlPbHNpYUhSMGNITTZMeTkzZDNjdWR6TXViM0puTHpJd01UZ3ZZM0psWkdWdWRHbGhiSE12ZGpFaVhTd2lkSGx3WlNJNld5SldaWEpwWm1saFlteGxRM0psWkdWdWRHbGhiQ0lzSWxOMGRXUmxiblJEY21Wa1pXNTBhV0ZzSWwwc0ltTnlaV1JsYm5ScFlXeFRkV0pxWldOMElqcDdmWDE5IiwiZXlKaGJHY2lPaUpGVXpJMU5pSXNJblI1Y0NJNkluWmpLM05rTFdwM2RDSXNJbXRwWkNJNkluVnVhWFpsY25OcGRIa3RhWE56ZFdWeUxXdGxlUzB5TURJeklpd2lZV3huSWpvaVJWTXlOVFlpZlEuZXlKcGMzTWlPaUpvZEhSd2N6b3ZMM1Z1YVhabGNuTnBkSGt0YVhOemRXVnlMbVY0WVcxd2JHVXVZMjl0SWl3aWMzVmlJam9pYzNSMVpHVnVkQzB4TWpNaUxDSnBZWFFpT2pFM01UWTVOVGsyTlRBc0ltVjRjQ0k2TVRjeE9UVTFNVFkxTUN3aVkyNW1JanA3SW1wM2F5STZleUpyZEhraU9pSkZReUlzSW1OeWRpSTZJbEF0TWpVMklpd2llQ0k2SWpkNFlrY3RTakJCVVhSd1VFRnlRazlaVG5ZeGVGbGZTbEIyWjBKV1IwazBNSEphYm5kcVRucFVkV01pTENKNUlqb2ljRUpTWjNJd2FXbGZTUzFEWDNwemVsWkRWRE5ZWTBOWlZIRTRhbUZ5T0ZoWlVtbFZiMFZvVlVRMFdTSjlmU3dpZG1NaU9uc2lRR052Ym5SbGVIUWlPbHNpYUhSMGNITTZMeTkzZDNjdWR6TXViM0puTHpJd01UZ3ZZM0psWkdWdWRHbGhiSE12ZGpFaVhTd2lkSGx3WlNJNld5SldaWEpwWm1saFlteGxRM0psWkdWdWRHbGhiQ0lzSWxOMGRXUmxiblJEY21Wa1pXNTBhV0ZzSWwwc0ltTnlaV1JsYm5ScFlXeFRkV0pxWldOMElqcDdmWDE5Il0sImFsZyI6IkVTMjU2In0.SIMULATED_SIGNATURE_FOR_DEMO_PURPOSES_ONLY~WyJzYWx0MSIsIm5hbWUiLCLlsbHnlLAgIOWkqumDjiJd~WyJzYWx0MiIsInN0dWRlbnRJZCIsIlMxMjM0NTY3OCJd~WyJzYWx0MyIsImRlcGFydG1lbnQiLCLlt6Xlrrbpg6gg5oOF5aCx5bel5a2m56ePIl0=~WyJzYWx0NCIsInN0YXR1cyIsImVucm9sbGVkIl0=`
    setSdJwt(sampleSdJwt)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/" className="mr-2">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">SD-JWT検証ツール</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SD-JWT検証</CardTitle>
            <CardDescription>
              SD-JWT形式の学生証明書を検証し、内容を確認できます。テキストを入力するか、ファイルをアップロードしてください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sd-jwt">SD-JWT</Label>
                <Textarea
                  id="sd-jwt"
                  placeholder="SD-JWTを入力してください..."
                  className="font-mono text-xs h-32"
                  value={sdJwt}
                  onChange={(e) => setSdJwt(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="file-upload">ファイルからアップロード</Label>
                  <div className="mt-1 flex items-center">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".json,.txt"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer flex items-center justify-center w-full border border-dashed border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {file ? file.name : "ファイルを選択"}
                    </Label>
                  </div>
                </div>

                <div className="flex-1">
                  <Label>サンプルデータ</Label>
                  <Button variant="outline" className="w-full mt-1" onClick={handleSampleData}>
                    <FileText className="h-4 w-4 mr-2" />
                    サンプルデータを使用
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleVerify} disabled={isVerifying} className="w-full sm:w-auto">
              {isVerifying ? "検証中..." : "検証"}
            </Button>
            <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto">
              クリア
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {verificationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                検証結果
              </CardTitle>
              <CardDescription>SD-JWTの検証結果と内容</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="decoded">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="decoded">デコード結果</TabsTrigger>
                  <TabsTrigger value="selective">選択的開示</TabsTrigger>
                  <TabsTrigger value="raw">生データ</TabsTrigger>
                </TabsList>

                <TabsContent value="decoded" className="mt-4 space-y-4">
                  <SdJwtDecoder sdJwt={sdJwt} />
                </TabsContent>

                <TabsContent value="selective" className="mt-4">
                  <SelectiveDisclosureDemo sdJwt={sdJwt} />
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs whitespace-pre-wrap">{sdJwt}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// SD-JWTの解析と検証を行う関数
async function parseAndVerifySdJwt(sdJwt: string) {
  try {
    // SD-JWTの形式を確認
    if (!sdJwt.includes("~")) {
      throw new Error("無効なSD-JWT形式です。'~'で区切られた開示値が必要です。")
    }

    // SD-JWTをパースする
    const [jwt, ...disclosures] = sdJwt.split("~")
    const [headerB64, payloadB64, signature] = jwt.split(".")

    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error("無効なJWT形式です。")
    }

    // Base64urlデコード
    const decodeBase64url = (str: string) => {
      try {
        // Base64url to Base64
        const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
        // パディングを追加
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
        // Base64デコードしてUTF-8として解釈
        const binaryString = atob(padded)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const utf8String = new TextDecoder("utf-8").decode(bytes)
        return JSON.parse(utf8String)
      } catch (e) {
        throw new Error("Base64デコードに失敗しました。")
      }
    }

    // ヘッダーとペイロードをデコード
    const header = decodeBase64url(headerB64)
    const payload = decodeBase64url(payloadB64)

    // 開示値をデコード
    const decodedDisclosures = disclosures.map((disclosure) => {
      try {
        return decodeBase64url(disclosure)
      } catch (e) {
        return ["デコード失敗", "無効な開示値"]
      }
    })

    // 検証結果を返す
    return {
      isValid: true, // デモのため常にtrue
      header,
      payload,
      disclosures: decodedDisclosures,
      jwt,
      signature,
    }
  } catch (error) {
    throw error
  }
}

// 選択的開示のデモコンポーネント
function SelectiveDisclosureDemo({ sdJwt }: { sdJwt: string }) {
  const [selectedClaims, setSelectedClaims] = useState<Record<string, boolean>>({
    name: true,
    studentId: true,
    department: true,
    status: true,
  })
  const [disclosedSdJwt, setDisclosedSdJwt] = useState<string | null>(null)

  const handleClaimToggle = (claim: string) => {
    setSelectedClaims((prev) => ({
      ...prev,
      [claim]: !prev[claim],
    }))
  }

  const handleCreateDisclosure = () => {
    try {
      // SD-JWTをパース
      const [jwt, ...disclosures] = sdJwt.split("~")

      // 開示値をデコード
      const decodedDisclosures = disclosures.map((disclosure) => {
        try {
          const base64 = disclosure.replace(/-/g, "+").replace(/_/g, "/")
          const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
          const binaryString = atob(padded)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const utf8String = new TextDecoder("utf-8").decode(bytes)
          return JSON.parse(utf8String)
        } catch (e) {
          return ["デコード失敗", "無効な開示値"]
        }
      })

      // 選択された開示値のみを含める
      const filteredDisclosures = disclosures.filter((_, index) => {
        const decoded = decodedDisclosures[index]
        if (Array.isArray(decoded) && decoded.length >= 3) {
          const claimName = decoded[1]
          return selectedClaims[claimName] === true
        }
        return false
      })

      // 新しいSD-JWTを作成
      const newSdJwt = [jwt, ...filteredDisclosures].join("~")
      setDisclosedSdJwt(newSdJwt)
    } catch (error) {
      console.error("選択的開示の作成に失敗しました:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">選択的開示について</h3>
            <p className="text-sm text-blue-700 mt-1">
              SD-JWTでは、証明書の一部の情報のみを選択的に開示することができます。
              以下のチェックボックスで開示する情報を選択し、「選択的開示を作成」ボタンをクリックしてください。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium mb-3">開示する情報を選択</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="claim-name" checked={selectedClaims.name} onCheckedChange={() => handleClaimToggle("name")} />
            <Label htmlFor="claim-name">氏名</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="claim-studentId"
              checked={selectedClaims.studentId}
              onCheckedChange={() => handleClaimToggle("studentId")}
            />
            <Label htmlFor="claim-studentId">学籍番号</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="claim-department"
              checked={selectedClaims.department}
              onCheckedChange={() => handleClaimToggle("department")}
            />
            <Label htmlFor="claim-department">所属</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="claim-status"
              checked={selectedClaims.status}
              onCheckedChange={() => handleClaimToggle("status")}
            />
            <Label htmlFor="claim-status">在籍状況</Label>
          </div>
        </div>

        <Button onClick={handleCreateDisclosure} className="mt-4">
          選択的開示を作成
        </Button>
      </div>

      {disclosedSdJwt && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">選択的開示の結果</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
            <pre className="text-xs whitespace-pre-wrap">{disclosedSdJwt}</pre>
          </div>
          <SdJwtDecoder sdJwt={disclosedSdJwt} />
        </div>
      )}
    </div>
  )
}
