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
  Webhook,
  Info,
} from "lucide-react"
import { VCMConfigManager, type VCMConnectionConfig, type VCMSyncSettings } from "@/lib/vcm-config"
import { VCMBrowserClient } from "@/lib/vcm-client-browser"

interface VCMConnectionSetupProps {
  onConfigChange?: (isConfigured: boolean) => void
}

export function VCMConnectionSetup({ onConfigChange }: VCMConnectionSetupProps) {
  const [config, setConfig] = useState<VCMConnectionConfig>({
    baseUrl: "https://v0-verifiable-credential-manager.vercel.app",
    apiKey: "sl_b05t7b1r1nb",
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
    batchSize: 10,
    retryAttempts: 3,
  })

  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionDetails, setConnectionDetails] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [useMockData, setUseMockData] = useState(true) // デフォルトでデモモードを有効に
  const [integrationStatus, setIntegrationStatus] = useState<any>(null)
  const [isRegisteringIntegration, setIsRegisteringIntegration] = useState(false)

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
    setConnectionDetails(null)

    try {
      const client = new VCMBrowserClient(config, useMockData)
      const result = await client.testConnection()

      if (result.success) {
        setConnectionStatus("success")
        setConnectionDetails(result)

        // For demo mode, set mock integration status
        if (useMockData) {
          setIntegrationStatus({
            status: "active",
            lastSync: new Date().toISOString(),
            webhookUrl: `${window.location.origin}/api/webhooks/vcm`,
          })
        }
      } else {
        setConnectionStatus("error")
        setConnectionError(result.message || "接続に失敗しました")
        setConnectionDetails(result)
      }
    } catch (error) {
      setConnectionStatus("error")
      setConnectionError(error instanceof Error ? error.message : "不明なエラーが発生しました")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const registerIntegration = async () => {
    setIsRegisteringIntegration(true)

    try {
      const client = new VCMBrowserClient(config, useMockData)
      const integration = await client.registerIntegration({
        name: "Student Login Site",
        url: window.location.origin,
        webhookSecret: "whisec_lf1jah5h",
        autoSync: true,
      })

      setIntegrationStatus({
        status: integration.status,
        lastSync: integration.lastSync,
        webhookUrl: `${window.location.origin}/api/webhooks/vcm`,
      })
    } catch (error) {
      console.error("Integration registration failed:", error)
      setConnectionError(error instanceof Error ? error.message : "統合の登録に失敗しました")
    } finally {
      setIsRegisteringIntegration(false)
    }
  }

  const syncCredentialTypes = async () => {
    if (!config.enabled) {
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const client = new VCMBrowserClient(config, useMockData)
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
      baseUrl: "https://v0-verifiable-credential-manager.vercel.app",
      apiKey: "sl_b05t7b1r1nb",
      organizationId: "",
      enabled: false,
      autoSync: false,
      syncInterval: 60,
    })
    setConnectionStatus("unknown")
    setConnectionError(null)
    setConnectionDetails(null)
    setSyncResult(null)
    setIntegrationStatus(null)
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
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>デモモードについて</AlertTitle>
          <AlertDescription>
            現在、VCMサーバーは開発中のため、デモモードを使用することをお勧めします。デモモードでは、実際のVCMサーバーに接続せずにモックデータを使用して機能をテストできます。
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">接続設定</TabsTrigger>
            <TabsTrigger value="integration">統合設定</TabsTrigger>
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
                    placeholder="https://v0-verifiable-credential-manager.vercel.app"
                    value={config.baseUrl}
                    onChange={(e) => handleConfigChange("baseUrl", e.target.value)}
                    disabled={useMockData}
                  />
                  {!useMockData && (
                    <div className="text-xs text-gray-500">
                      例: https://vcm-api.example.com または http://localhost:3001
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="sl_b05t7b1r1nb"
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                    disabled={useMockData}
                  />
                  <div className="text-xs text-gray-500">
                    VCMの統合設定画面で表示されているAPI Keyを入力してください
                  </div>
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

                    {connectionDetails && connectionDetails.statusCode && (
                      <div className="mt-2 text-sm">
                        <p>ステータスコード: {connectionDetails.statusCode}</p>
                        {connectionDetails.error && <p>エラータイプ: {connectionDetails.error}</p>}
                      </div>
                    )}

                    {connectionStatus === "error" && !useMockData && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">トラブルシューティング:</p>
                        <ul className="list-disc list-inside text-sm mt-1">
                          <li>URLが正しいか確認してください</li>
                          <li>VCMサーバーが起動しているか確認してください</li>
                          <li>API Keyが正しいか確認してください</li>
                          <li>ネットワーク接続を確認してください</li>
                          <li>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm underline"
                              onClick={() => setUseMockData(true)}
                            >
                              デモモードを使用する
                            </Button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="integration" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">統合設定について</h4>
                <p className="text-sm text-blue-700">
                  VCMシステムとの統合を登録することで、自動的にクレデンシャルタイプの同期やWebhook通知を受け取ることができます。
                </p>
              </div>

              {integrationStatus && (
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-3">現在の統合ステータス</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">ステータス</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={integrationStatus.status === "active" ? "default" : "secondary"}>
                          {integrationStatus.status === "active" ? "アクティブ" : "非アクティブ"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">最終同期</Label>
                      <div>{formatLastSync(integrationStatus.lastSync)}</div>
                    </div>
                    {integrationStatus.webhookUrl && (
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Webhook URL</Label>
                        <div className="text-xs font-mono bg-gray-100 p-2 rounded">{integrationStatus.webhookUrl}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2">統合情報</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Student Login Site URL</Label>
                      <div className="font-mono text-xs">{window.location.origin}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Webhook Secret</Label>
                      <div className="font-mono text-xs">whisec_lf1jah5h</div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={registerIntegration}
                  disabled={isRegisteringIntegration || !config.enabled}
                  className="w-full"
                >
                  {isRegisteringIntegration ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Webhook className="h-4 w-4 mr-2" />
                  )}
                  統合を登録
                </Button>
              </div>
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
                          {syncResult.errors.map((error: string, index: number) => (
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

              {integrationStatus && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Webhook className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="font-medium">統合ステータス</div>
                      <div className="text-sm text-gray-500">VCMとの統合状態</div>
                    </div>
                  </div>
                  <Badge variant={integrationStatus.status === "active" ? "default" : "secondary"}>
                    {integrationStatus.status === "active" ? "アクティブ" : "非アクティブ"}
                  </Badge>
                </div>
              )}

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
