"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Link,
  Database,
} from "lucide-react"
import { VCMConfigManager, type VCMConnectionConfig, type VCMSyncSettings } from "@/lib/vcm-config"
import { VCMClient, MockVCMClient, type VCMSyncResult } from "@/lib/vcm-client"

interface VCMConnectionSetupProps {
  onConfigChange?: (isConfigured: boolean) => void
}

export function VCMConnectionSetup({ onConfigChange }: VCMConnectionSetupProps) {
  const [config, setConfig] = useState<VCMConnectionConfig>({
    baseUrl: "",
    apiKey: "",
    organizationId: "",
    enabled: false,
    autoSync: false,
    syncInterval: 60,
  })

  const [syncSettings, setSyncSettings] = useState<VCMSyncSettings>({
    includeDeprecated: false,
    overwriteLocal: true,
    syncOnStartup: false,
    notifyOnSync: true,
  })

  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<VCMSyncResult | null>(null)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    // Load saved configuration
    const savedConfig = VCMConfigManager.getConfig()
    if (savedConfig) {
      setConfig(savedConfig)
    }

    const savedSyncSettings = VCMConfigManager.getSyncSettings()
    setSyncSettings(savedSyncSettings)

    onConfigChange?.(VCMConfigManager.isConfigured())
  }, [onConfigChange])

  const handleConfigChange = (field: keyof VCMConnectionConfig, value: any) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)
    VCMConfigManager.saveConfig(newConfig)
    onConfigChange?.(VCMConfigManager.isConfigured())
  }

  const handleSyncSettingsChange = (field: keyof VCMSyncSettings, value: any) => {
    const newSettings = { ...syncSettings, [field]: value }
    setSyncSettings(newSettings)
    VCMConfigManager.saveSyncSettings(newSettings)
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionStatus("unknown")
    setConnectionError(null)

    try {
      const client = useMockData ? new MockVCMClient(config) : new VCMClient(config)

      const isConnected = await client.testConnection()

      if (isConnected) {
        setConnectionStatus("success")
      } else {
        setConnectionStatus("error")
        setConnectionError("接続に失敗しました。設定を確認してください。")
      }
    } catch (error) {
      setConnectionStatus("error")
      setConnectionError(error instanceof Error ? error.message : "不明なエラーが発生しました")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const syncCredentialTypes = async () => {
    if (!config.enabled) {
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const client = useMockData ? new MockVCMClient(config) : new VCMClient(config)

      const result = await client.syncCredentialTypes()
      setSyncResult(result)

      if (result.success) {
        VCMConfigManager.updateLastSync()
        setConfig((prev) => ({ ...prev, lastSync: new Date().toISOString() }))
      }
    } catch (error) {
      setSyncResult({
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "同期に失敗しました"],
        lastSync: new Date().toISOString(),
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const clearConfiguration = () => {
    VCMConfigManager.clearConfig()
    setConfig({
      baseUrl: "",
      apiKey: "",
      organizationId: "",
      enabled: false,
      autoSync: false,
      syncInterval: 60,
    })
    setConnectionStatus("unknown")
    setConnectionError(null)
    setSyncResult(null)
    onConfigChange?.(false)
  }

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return "未同期"
    return new Date(lastSync).toLocaleString("ja-JP")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Link className="h-5 w-5 mr-2" />
          Verifiable Credential Manager 連携
        </CardTitle>
        <CardDescription>VCMとの連携を設定して、クレデンシャルタイプとスキーマを同期します</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">接続設定</TabsTrigger>
            <TabsTrigger value="sync">同期設定</TabsTrigger>
            <TabsTrigger value="status">ステータス</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">デモモード</Label>
                  <div className="text-sm text-gray-500">実際のVCMの代わりにモックデータを使用</div>
                </div>
                <Switch checked={useMockData} onCheckedChange={setUseMockData} />
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">VCM Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://vcm.example.com"
                    value={config.baseUrl}
                    onChange={(e) => handleConfigChange("baseUrl", e.target.value)}
                    disabled={useMockData}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="your-api-key"
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                    disabled={useMockData}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization ID</Label>
                  <Input
                    id="organizationId"
                    placeholder="org-12345"
                    value={config.organizationId}
                    onChange={(e) => handleConfigChange("organizationId", e.target.value)}
                    disabled={useMockData}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">連携を有効にする</Label>
                  <div className="text-sm text-gray-500">VCMとの連携機能を有効にします</div>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleConfigChange("enabled", checked)}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={testConnection}
                  disabled={isTestingConnection || (!useMockData && (!config.baseUrl || !config.apiKey))}
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  接続テスト
                </Button>

                <Button onClick={clearConfiguration} variant="destructive">
                  設定をクリア
                </Button>
              </div>

              {connectionStatus !== "unknown" && (
                <Alert variant={connectionStatus === "success" ? "default" : "destructive"}>
                  {connectionStatus === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{connectionStatus === "success" ? "接続成功" : "接続失敗"}</AlertTitle>
                  <AlertDescription>
                    {connectionStatus === "success" ? "VCMとの接続が正常に確立されました。" : connectionError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">自動同期</Label>
                  <div className="text-sm text-gray-500">定期的にクレデンシャルタイプを自動同期します</div>
                </div>
                <Switch
                  checked={config.autoSync}
                  onCheckedChange={(checked) => handleConfigChange("autoSync", checked)}
                />
              </div>

              {config.autoSync && (
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">同期間隔（分）</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    min="5"
                    max="1440"
                    value={config.syncInterval}
                    onChange={(e) => handleConfigChange("syncInterval", Number.parseInt(e.target.value))}
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">非推奨タイプを含める</Label>
                    <div className="text-sm text-gray-500">非推奨のクレデンシャルタイプも同期対象に含めます</div>
                  </div>
                  <Switch
                    checked={syncSettings.includeDeprecated}
                    onCheckedChange={(checked) => handleSyncSettingsChange("includeDeprecated", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">ローカル設定を上書き</Label>
                    <div className="text-sm text-gray-500">同期時にローカルの設定をVCMの設定で上書きします</div>
                  </div>
                  <Switch
                    checked={syncSettings.overwriteLocal}
                    onCheckedChange={(checked) => handleSyncSettingsChange("overwriteLocal", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">起動時に同期</Label>
                    <div className="text-sm text-gray-500">アプリケーション起動時に自動的に同期を実行します</div>
                  </div>
                  <Switch
                    checked={syncSettings.syncOnStartup}
                    onCheckedChange={(checked) => handleSyncSettingsChange("syncOnStartup", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">同期通知</Label>
                    <div className="text-sm text-gray-500">同期完了時に通知を表示します</div>
                  </div>
                  <Switch
                    checked={syncSettings.notifyOnSync}
                    onCheckedChange={(checked) => handleSyncSettingsChange("notifyOnSync", checked)}
                  />
                </div>
              </div>

              <Button onClick={syncCredentialTypes} disabled={!config.enabled || isSyncing} className="w-full">
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                今すぐ同期
              </Button>

              {syncResult && (
                <Alert variant={syncResult.success ? "default" : "destructive"}>
                  {syncResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle>{syncResult.success ? "同期完了" : "同期エラー"}</AlertTitle>
                  <AlertDescription>
                    {syncResult.success ? (
                      `${syncResult.synced}個のクレデンシャルタイプを同期しました。`
                    ) : (
                      <div>
                        <p>同期中にエラーが発生しました：</p>
                        <ul className="list-disc list-inside mt-1">
                          {syncResult.errors.map((error, index) => (
                            <li key={index} className="text-sm">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">連携ステータス</div>
                    <div className="text-sm text-gray-500">VCMとの接続状態</div>
                  </div>
                </div>
                <Badge variant={config.enabled ? "default" : "secondary"}>{config.enabled ? "有効" : "無効"}</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">最終同期</div>
                    <div className="text-sm text-gray-500">最後にクレデンシャルタイプを同期した日時</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatLastSync(config.lastSync)}</div>
                  {config.autoSync && (
                    <div className="text-sm text-gray-500">{config.syncInterval}分間隔で自動同期</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">設定状態</div>
                    <div className="text-sm text-gray-500">必要な設定項目の入力状況</div>
                  </div>
                </div>
                <Badge variant={VCMConfigManager.isConfigured() ? "default" : "destructive"}>
                  {VCMConfigManager.isConfigured() ? "設定完了" : "設定不完全"}
                </Badge>
              </div>

              {useMockData && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>デモモード</AlertTitle>
                  <AlertDescription>
                    現在デモモードで動作しています。実際のVCMではなくモックデータを使用しています。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
