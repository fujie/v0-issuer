"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface SdJwtDecoderProps {
  sdJwt: string
}

export function SdJwtDecoder({ sdJwt }: SdJwtDecoderProps) {
  const [decodedData, setDecodedData] = useState<{
    header: any
    payload: any
    disclosures: any[]
    isValid: boolean
  } | null>(null)

  useEffect(() => {
    if (sdJwt) {
      try {
        // SD-JWTをパース
        const [jwt, ...disclosures] = sdJwt.split("~")
        const [headerB64, payloadB64] = jwt.split(".")

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
            console.error("Base64 decode error:", e)
            return null
          }
        }

        // ヘッダーとペイロードをデコード
        const header = decodeBase64url(headerB64)
        const payload = decodeBase64url(payloadB64)

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

        setDecodedData({
          header,
          payload,
          disclosures: decodedDisclosures,
          isValid: true,
        })
      } catch (error) {
        console.error("SD-JWT decode error:", error)
        setDecodedData(null)
      }
    }
  }, [sdJwt])

  if (!decodedData) {
    return <div>デコード中...</div>
  }

  // 開示値から属性情報を抽出
  const attributes = decodedData.disclosures.reduce(
    (acc, disclosure) => {
      if (Array.isArray(disclosure) && disclosure.length >= 3) {
        const [salt, key, value] = disclosure
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, any>,
  )

  // 有効期限をフォーマット
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "不明"
    return new Date(timestamp * 1000).toLocaleString("ja-JP")
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">基本情報</h3>
          <Card className="p-4">
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">発行者</dt>
                <dd className="col-span-2">{decodedData.payload.iss || "不明"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">サブジェクト</dt>
                <dd className="col-span-2">{decodedData.payload.sub || "不明"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">発行日時</dt>
                <dd className="col-span-2">{formatDate(decodedData.payload.iat)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">有効期限</dt>
                <dd className="col-span-2">{formatDate(decodedData.payload.exp)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">アルゴリズム</dt>
                <dd className="col-span-2">{decodedData.header.alg || "不明"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">タイプ</dt>
                <dd className="col-span-2">{decodedData.header.typ || "不明"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-gray-500">検証結果</dt>
                <dd className="col-span-2">
                  <Badge
                    variant={decodedData.isValid ? "success" : "destructive"}
                    className="bg-green-100 text-green-800"
                  >
                    {decodedData.isValid ? "有効" : "無効"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">証明書の内容</h3>
          <Card className="p-4">
            <dl className="grid grid-cols-1 gap-2 text-sm">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-1">
                  <dt className="font-medium text-gray-500">
                    {key === "name" && "氏名"}
                    {key === "studentId" && "学籍番号"}
                    {key === "department" && "所属"}
                    {key === "status" && "在籍状況"}
                    {!["name", "studentId", "department", "status"].includes(key) && key}
                  </dt>
                  <dd className="col-span-2">{value}</dd>
                </div>
              ))}
              {Object.keys(attributes).length === 0 && (
                <div className="text-gray-500">開示された属性情報がありません</div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="header">
          <AccordionTrigger>ヘッダー</AccordionTrigger>
          <AccordionContent>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-xs">{JSON.stringify(decodedData.header, null, 2)}</pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payload">
          <AccordionTrigger>ペイロード</AccordionTrigger>
          <AccordionContent>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-xs">{JSON.stringify(decodedData.payload, null, 2)}</pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="disclosures">
          <AccordionTrigger>開示値</AccordionTrigger>
          <AccordionContent>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-xs">{JSON.stringify(decodedData.disclosures, null, 2)}</pre>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
