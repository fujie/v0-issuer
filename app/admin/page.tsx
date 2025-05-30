"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { VCMConnectionSetup } from "@/components/vcm-connection-setup"
import { VCMCredentialBrowser } from "@/components/vcm-credential-browser"

export default function AdminPage() {
  const [isVCMConfigured, setIsVCMConfigured] = useState(false)

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
