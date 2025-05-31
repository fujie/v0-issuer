"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { VCMConfigManager } from "@/lib/vcm-config"
import { CredentialTemplateManager } from "@/lib/credential-templates-enhanced"
import { VCMBrowserClient } from "@/lib/vcm-client-browser"

interface VCMStatus {
  config: any
  templates: any[]
  serverSync: any
  connection: {
    status: "connected" | "disconnected" | "error"
    message: string
    lastChecked: string
  }
}

export default function VCMDebugPage() {
  const [vcmStatus, setVcmStatus] = useState<VCMStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  const loadVCMStatus = async () => {
    setLoading(true)
    try {
      // VCM設定を取得
      const config = VCMConfigManager.getConfig()

      // テンプレート情報を取得
      const allTemplates = await CredentialTemplateManager.getAllTemplates()
      const vcmTemplates = allTemplates.filter((t) => t.source === "vcm")

      // サーバー同期状況を取得
      const serverSync = await CredentialTemplateManager.getServerSyncStatus()

      // デバッグ情報を取得
      const debugInfo = CredentialTemplateManager.getDebugInfo()

      setVcmStatus({
        config: {
          ...config,
          debugInfo,
        },
        templates: vcmTemplates,
        serverSync,
        connection: {
          status: config?.enabled ? "connected" : "disconnected",
          message: config?.enabled ? "VCM連携が有効です" : "VCM連携が無効です",
          lastChecked: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Error loading VCM status:", error)
      setVcmStatus({
        config: null,
        templates: [],
        serverSync: { hasSyncedData: false, syncedTemplatesCount: 0 },
        connection: {
          status: "error",
          message: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
          lastChecked: new Date().toISOString(),
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const testVCMConnection = async () => {
    setTesting(true)
    try {
      const config = VCMConfigManager.getConfig()

      if (!config || !config.enabled) {
        alert("VCM連携が有効になっていません")
        return
      }

      console.log("Testing VCM connection...")
      const client = new VCMBrowserClient(config, config.useMockData ?? false)

      // 接続テスト
      const credentialTypes = await client.getCredentialTypes()
      console.log("VCM connection test successful:", credentialTypes.length)

      alert(`VCM接続テスト成功！${credentialTypes.length}個のクレデンシャルタイプが見つかりました。`)

      // ステータスを更新
      await loadVCMStatus()
    } catch (error) {
      console.error("VCM connection test failed:", error)
      alert(`VCM接続テスト失敗: ${error instanceof Error ? error.message : "不明なエラー"}`)
    } finally {
      setTesting(false)
    }
  }

  const syncVCMTemplates = async () => {
    try {
      console.log("Starting VCM template sync...")
      const result = await CredentialTemplateManager.syncFromVCM()

      if (result.success) {
        alert(`VCM同期成功！${result.synced}個のテンプレートを同期しました。`)
      } else {
        alert(`VCM同期に問題があります: ${result.errors.join(", ")}`)
      }

      // ステータスを更新
      await loadVCMStatus()
    } catch (error) {
      console.error("VCM sync failed:", error)
      alert(`VCM同期失敗: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }

  const clearVCMData = () => {
    if (confirm("VCMデータをクリアしますか？この操作は元に戻せません。")) {
      CredentialTemplateManager.clearSyncedTemplates()
      VCMConfigManager.clearConfig()
      alert("VCMデータをクリアしました")
      loadVCMStatus()
    }
  }

  useEffect(() => {
    loadVCMStatus()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">VCM状況を読み込み中...</span>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "disconnected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800"
      case "disconnected":
        return "bg-red-100 text-red-800"
      case "error":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">VCM デバッグ情報</h1>
          <p className="text-gray-600 mt-2">Verifiable Credential Management システムの状況を確認できます</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadVCMStatus} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            更新
          </Button>
        </div>
      </div>

      {/* ステータス概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VCM接続状況</CardTitle>
            {getStatusIcon(vcmStatus?.connection.status || "disconnected")}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge className={getStatusColor(vcmStatus?.connection.status || "disconnected")}>
                {vcmStatus?.connection.status || "不明"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{vcmStatus?.connection.message}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VCMテンプレート</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vcmStatus?.templates.length || 0}</div>
            <p className="text-xs text-muted-foreground">同期済みテンプレート数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">サーバー同期</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge
                className={
                  vcmStatus?.serverSync.hasSyncedData ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }
              >
                {vcmStatus?.serverSync.hasSyncedData ? "同期済み" : "未同期"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {vcmStatus?.serverSync.syncedTemplatesCount || 0}個のテンプレート
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細情報 */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">設定情報</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="sync">同期状況</TabsTrigger>
          <TabsTrigger value="actions">アクション</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>VCM設定情報</CardTitle>
              <CardDescription>現在のVCM設定とデバッグ情報</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
                {JSON.stringify(vcmStatus?.config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>VCMテンプレート一覧</CardTitle>
              <CardDescription>同期されたVCMテンプレートの詳細情報</CardDescription>
            </CardHeader>
            <CardContent>
              {vcmStatus?.templates && vcmStatus.templates.length > 0 ? (
                <div className="space-y-4">
                  {vcmStatus.templates.map((template, index) => (
                    <div key={template.id || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{template.name || template.id}</h3>
                        <Badge variant="outline">{template.source}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="text-xs text-gray-500">
                        <p>ID: {template.id}</p>
                        <p>クレーム数: {template.claims?.length || 0}</p>
                        <p>
                          最終同期:{" "}
                          {template.lastSynced ? new Date(template.lastSynced).toLocaleString("ja-JP") : "不明"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">VCMテンプレートが見つかりません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>同期状況</CardTitle>
              <CardDescription>ローカルとサーバーの同期状況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">サーバー同期状況</h4>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
                    {JSON.stringify(vcmStatus?.serverSync, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>VCMアクション</CardTitle>
              <CardDescription>VCMの操作とテスト機能</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={testVCMConnection} disabled={testing} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {testing ? "接続テスト中..." : "VCM接続テスト"}
                  </Button>

                  <Button onClick={syncVCMTemplates} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    VCMテンプレート同期
                  </Button>

                  <Button onClick={clearVCMData} variant="destructive" className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    VCMデータクリア
                  </Button>

                  <Button
                    onClick={() => window.open("/admin", "_blank")}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    管理画面を開く
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">VCM使用方法</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>管理画面でVCM設定を有効にする</li>
                    <li>「VCM接続テスト」で接続を確認</li>
                    <li>「VCMテンプレート同期」でテンプレートを取得</li>
                    <li>Issuer Metadataページで同期状況を確認</li>
                    <li>エンドポイントテストでメタデータを検証</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
