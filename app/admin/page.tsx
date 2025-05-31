"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

// Dynamically import components that use browser APIs
const VCMConnectionSetup = dynamic(
  () => import("@/components/vcm-connection-setup").then((mod) => ({ default: mod.VCMConnectionSetup })),
  {
    ssr: false,
    loading: () => <div className="p-4">VCM連携設定を読み込み中...</div>,
  },
)

const VCMCredentialBrowser = dynamic(
  () => import("@/components/vcm-credential-browser").then((mod) => ({ default: mod.VCMCredentialBrowser })),
  {
    ssr: false,
    loading: () => <div className="p-4">クレデンシャルタイプを読み込み中...</div>,
  },
)

export default function AdminPage() {
  const [isVCMConfigured, setIsVCMConfigured] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // VCM設定の詳細をログ出力
    const config = typeof window !== "undefined" ? localStorage.getItem("vcm_connection_config") : null
    console.log("=== Admin Page VCM Config Debug ===")
    console.log("Raw config from localStorage:", config)

    if (config) {
      try {
        const parsedConfig = JSON.parse(config)
        console.log("Parsed config:", {
          enabled: parsedConfig.enabled,
          useMockData: parsedConfig.useMockData,
          hasBaseUrl: !!parsedConfig.baseUrl,
          hasApiKey: !!parsedConfig.apiKey,
        })
      } catch (e) {
        console.error("Failed to parse config:", e)
      }
    }

    console.log("====================================")
  }, [])

  if (!isMounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Link href="/dashboard-demo" className="mr-2">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">システム管理</h1>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">管理画面を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/dashboard-demo" className="mr-2">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ダッシュボードに戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">システム管理</h1>
      </div>

      <Tabs defaultValue="vcm-connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vcm-connection">VCM連携設定</TabsTrigger>
          <TabsTrigger value="credential-types">クレデンシャルタイプ</TabsTrigger>
        </TabsList>

        <TabsContent value="vcm-connection" className="mt-6">
          <VCMConnectionSetup onConfigChange={setIsVCMConfigured} />
        </TabsContent>

        <TabsContent value="credential-types" className="mt-6">
          <VCMCredentialBrowser />
        </TabsContent>
      </Tabs>
    </div>
  )
}
