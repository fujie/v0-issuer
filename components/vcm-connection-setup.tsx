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
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Link,
  Webhook,
  Info,
  Database,
  Settings,
} from "lucide-react"

// 型定義
interface VCMConnectionConfig {
  baseUrl: string
  apiKey: string
  organizationId?: string
  enabled: boolean
  autoSync: boolean
  syncInterval: number
  useMockData: boolean
  lastSync?: string
}

interface VCMSyncSettings {
  includeDeprecated: boolean
  overwriteLocal: boolean
  syncOnStartup: boolean
  notifyOnSync: boolean
  batchSize: number
  retryAttempts: number
}

// シンプルなローカルストレージヘルパー - クライアントサイドでのみ実行
const LocalStorageHelper = {
  getItem: (key: string, defaultValue: any = null): any => {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e)
      return defaultValue
    }
  },

  setItem: (key: string, value: any): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e)
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error(`Error removing ${key} from localStorage:`, e)
    }
  },
}

// VCM設定マネージャー - クライアントサイドでのみ実行
const VCMConfigManager = {
  getConfig: (): VCMConnectionConfig => {
    return LocalStorageHelper.getItem("vcm_connection_config", {
      baseUrl: "https://v0-verifiable-credential-manager.vercel.app",
      apiKey: "sl_b05t7b1r1nb",
      organizationId: "",
      enabled: false,
      autoSync: false,
      syncInterval: 60,
      useMockData: false,
    })
  },

  saveConfig: (config: VCMConnectionConfig): void => {
    LocalStorageHelper.setItem("vcm_connection_config", config)
  },

  getSyncSettings: (): VCMSyncSettings => {
    return LocalStorageHelper.getItem("vcm_sync_settings", {
      includeDeprecated: false,
      overwriteLocal: true,
      syncOnStartup: false,
      notifyOnSync: true,
      batchSize: 10,
      retryAttempts: 3,
    })
  },

  saveSyncSettings: (settings: VCMSyncSettings): void => {
    LocalStorageHelper.setItem("vcm_sync_settings", settings)
  },

  updateLastSync: (): void => {
    const config = VCMConfigManager.getConfig()
    config.lastSync = new Date().toISOString()
    VCMConfigManager.saveConfig(config)
  },

  clearConfig: (): void => {
    LocalStorageHelper.removeItem("vcm_connection_config")
    LocalStorageHelper.removeItem("vcm_sync_settings")
  },

  isConfigured: (): boolean => {
    const config = VCMConfigManager.getConfig()
    return config.enabled && (config.useMockData || (!!config.baseUrl && !!config.apiKey))
  },
}

interface VCMConnectionSetupProps {
  onConfigChange?: (isConfigured: boolean) => void
}

export function VCMConnectionSetup({ onConfigChange }: VCMConnectionSetupProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [config, setConfig] = useState<VCMConnectionConfig>({
    baseUrl: "https://v0-verifiable-credential-manager.vercel.app",
    apiKey: "sl_b05t7b1r1nb",
    organizationId: "",
    enabled: false,
    autoSync: false,
    syncInterval: 60,
    useMockData: false,
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
  const [integrationStatus, setIntegrationStatus] = useState<any>(null)
  const [isRegisteringIntegration, setIsRegisteringIntegration] = useState(false)

  // クライアントサイドでのみ実行されるuseEffect
  useEffect(() => {
    setIsMounted(true)

    // Load saved configuration
    const savedConfig = VCMConfigManager.getConfig()
    setConfig(savedConfig)

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

  const handleUseMockDataChange = (useMockData: boolean) => {
    const newConfig = { ...config, useMockData }
    setConfig(newConfig)
    VCMConfigManager.saveConfig(newConfig)

    // デモモードを有効にした場合、連携も自動的に有効にする
    if (useMockData && !newConfig.enabled) {
      const enabledConfig = { ...newConfig, enabled: true }
      setConfig(enabledConfig)
      VCMConfigManager.saveConfig(enabledConfig)
      onConfigChange?.(true)
    }
  }

  const testConnection = async () => {
    if (!isMounted) return

    setIsTestingConnection(true)
    setConnectionStatus("unknown")
    setConnectionError(null)
    setConnectionDetails(null)

    try {
      console.log(`Testing VCM connection to ${config.baseUrl} (Mock: ${config.useMockData})`)

      const response = await fetch("/api/vcm/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          useMockData: config.useMockData,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Test connection result:", result)

      if (result.success) {
        setConnectionStatus("success")
        setConnectionDetails(result)

        // For demo mode, set mock integration status
        if (config.useMockData) {
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
    if (!isMounted) return

    setIsRegisteringIntegration(true)

    try {
      console.log(`Registering integration with ${config.baseUrl} (Mock: ${config.useMockData})`)

      const response = await fetch("/api/vcm/register-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          useMockData: config.useMockData,
          integration: {
            name: "Student Login Site",
            url: window.location.origin,
            webhookSecret: "whisec_lf1jah5h",
            autoSync: true,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("Register integration result:", result)

      if (result.success) {
        setIntegrationStatus({
          status: result.integration.status,
          lastSync: result.integration.lastSync,
          webhookUrl: `${window.location.origin}/api/webhooks/vcm`,
        })
      } else {
        throw new Error(result.message || "統合の登録に失敗しました")
      }
    } catch (error) {
      console.error("Integration registration failed:", error)
      setConnectionError(error instanceof Error ? error.message : "統合の登録に失敗しました")
    } finally {
      setIsRegisteringIntegration(false)
    }
  }

  const syncCredentialTypes = async () => {
    if (!isMounted) return

    if (!config.enabled) {
      setSyncResult({
        success: false,
        synced: 0,
        errors: ["VCM連携が有効になっていません。まず連携を有効にしてください。"],
        lastSync: new Date().toISOString(),
      })
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      console.log("=== Starting credential types sync ===")
      console.log("Config:", {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : null,
        useMockData: config.useMockData,
        enabled: config.enabled,
      })

      // API経由でクレデンシャルタイプを取得
      const params = new URLSearchParams({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        useMockData: config.useMockData.toString(),
      })

      const requestUrl = `/api/vcm/credential-types?${params}`
      console.log("Request URL:", requestUrl)
      console.log("Request params:", Object.fromEntries(params.entries()))

      const requestStart = Date.now()

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const requestTime = Date.now() - requestStart
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        requestTime,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("HTTP Error Response:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("Response data:", result)

      if (!result.success) {
        throw new Error(result.message || "クレデンシャルタイプの取得に失敗しました")
      }

      const credentialTypes = result.credentialTypes || []
      console.log("Credential types to sync:", credentialTypes.length)

      // クライアントサイドでローカルストレージに保存
      let syncedCount = 0
      const errors: string[] = []

      for (const vcmType of credentialTypes) {
        try {
          console.log("Processing credential type:", vcmType.id, vcmType.name)

          // VCMタイプをローカルテンプレート形式に変換
          const template = convertVCMTypeToLocalTemplate(vcmType)

          // ローカルストレージに保存
          const existingTemplates = getLocalTemplates()
          const updatedTemplates = existingTemplates.filter((t) => t.id !== template.id)
          updatedTemplates.push(template)

          LocalStorageHelper.setItem("vcm_synced_templates", updatedTemplates)
          syncedCount++
          console.log("Successfully synced:", template.id)
        } catch (error) {
          const errorMsg = `Failed to sync ${vcmType.name}: ${error instanceof Error ? error.message : "不明なエラー"}`
          errors.push(errorMsg)
          console.error("Sync error for", vcmType.id, ":", error)
        }
      }

      const syncResult = {
        success: errors.length === 0,
        synced: syncedCount,
        errors,
        lastSync: new Date().toISOString(),
        mode: result.mode,
        debugInfo: {
          ...result.debugInfo,
          clientRequestTime: requestTime,
          totalProcessingTime: Date.now() - requestStart,
        },
        requestDetails: {
          url: requestUrl,
          method: "GET",
          params: Object.fromEntries(params.entries()),
          responseStatus: response.status,
          responseTime: requestTime,
        },
        errorDetails: result.errorDetails,
      }

      console.log("Sync completed:", syncResult)
      setSyncResult(syncResult)

      if (syncResult.success) {
        VCMConfigManager.updateLastSync()
        const updatedConfig = { ...config, lastSync: new Date().toISOString() }
        setConfig(updatedConfig)
        VCMConfigManager.saveConfig(updatedConfig)
      }
    } catch (error) {
      console.error("=== Sync error ===", error)
      const errorResult = {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "同期に失敗しました"],
        lastSync: new Date().toISOString(),
        errorDetails: {
          type: "CLIENT_ERROR",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      }
      setSyncResult(errorResult)
    } finally {
      setIsSyncing(false)
    }
  }

  // ヘルパー関数
  const convertVCMTypeToLocalTemplate = (vcmType: any) => {
    const properties = vcmType.schema?.properties || {}
    const required = vcmType.schema?.required || []

    const claims = Object.entries(properties).map(([key, property]: [string, any]) => ({
      key,
      name: property.title || key,
      description: property.description || `${key} field`,
      type: mapSchemaTypeToClaimType(property.type, property.format),
      required: required.includes(key),
      selectiveDisclosure: property.selectiveDisclosure || false,
      defaultValue: property.default,
      enum: property.enum,
      pattern: property.pattern,
      minLength: property.minLength,
      maxLength: property.maxLength,
    }))

    return {
      id: vcmType.id,
      name: vcmType.display?.name || vcmType.name,
      description: vcmType.display?.description || vcmType.description,
      type: vcmType.issuanceConfig?.type || ["VerifiableCredential"],
      context: vcmType.issuanceConfig?.context || ["https://www.w3.org/2018/credentials/v1"],
      claims,
      display: {
        name: vcmType.display?.name || vcmType.name,
        locale: vcmType.display?.locale || "ja-JP",
        backgroundColor: vcmType.display?.backgroundColor || "#1e40af",
        textColor: vcmType.display?.textColor || "#ffffff",
        logo: vcmType.display?.logo,
      },
      validityPeriod: vcmType.issuanceConfig?.validityPeriod || 365,
      issuer: vcmType.issuanceConfig?.issuer || "https://university.example.com",
      version: vcmType.version || "1.0.0",
      status: vcmType.status || "active",
      source: "vcm" as const,
      vcmId: vcmType.id,
      lastSynced: new Date().toISOString(),
      syncStatus: "synced" as const,
    }
  }

  const mapSchemaTypeToClaimType = (schemaType: string, format?: string): string => {
    if (format === "date" || format === "date-time") {
      return "date"
    }

    switch (schemaType) {
      case "integer":
      case "number":
        return "number"
      case "boolean":
        return "boolean"
      case "string":
      default:
        return "string"
    }
  }

  const getLocalTemplates = (): any[] => {
    return LocalStorageHelper.getItem("vcm_synced_templates", [])
  }

  const clearConfiguration = () => {
    if (!isMounted) return

    VCMConfigManager.clearConfig()
    const defaultConfig = {
      baseUrl: "https://v0-verifiable-credential-manager.vercel.app",
      apiKey: "sl_b05t7b1r1nb",
      organizationId: "",
      enabled: false,
      autoSync: false,
      syncInterval: 60,
      useMockData: false,
    }
    setConfig(defaultConfig)
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

  // サーバーサイドレンダリング時は最小限のコンテンツを表示
  if (!isMounted) {
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
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    )
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
                <Switch checked={config.useMockData ?? false} onCheckedChange={handleUseMockDataChange} />
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
                    disabled={config.useMockData}
                  />
                  {!config.useMockData && (
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
                    disabled={config.useMockData}
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
                  disabled={isTestingConnection || (!config.useMockData && (!config.baseUrl || !config.apiKey))}
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
                    <div className="space-y-3">
                      <p>{connectionStatus === "success" ? "VCMとの接続が正常に確立されました。" : connectionError}</p>

                      {connectionDetails && connectionDetails.healthData && (
                        <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
                          <p>
                            <strong>VCMサービス:</strong> {connectionDetails.healthData.service}
                          </p>
                          <p>
                            <strong>バージョン:</strong> {connectionDetails.healthData.version}
                          </p>
                          <p>
                            <strong>ステータス:</strong> {connectionDetails.healthData.status}
                          </p>
                          {connectionDetails.healthData.authentication && (
                            <p>
                              <strong>認証:</strong>{" "}
                              {connectionDetails.healthData.authentication.required ? "必要" : "不要"}(
                              {connectionDetails.healthData.authentication.status})
                            </p>
                          )}
                          {connectionDetails.method && (
                            <p>
                              <strong>接続方法:</strong> {connectionDetails.method} {connectionDetails.endpoint}
                            </p>
                          )}
                          {connectionDetails.healthData.features && (
                            <div className="mt-2">
                              <p>
                                <strong>利用可能な機能:</strong>
                              </p>
                              <ul className="list-disc list-inside ml-4">
                                {Object.entries(connectionDetails.healthData.features).map(([feature, enabled]) => (
                                  <li key={feature} className={enabled ? "text-green-600" : "text-red-600"}>
                                    {feature}: {enabled ? "有効" : "無効"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {connectionDetails && connectionDetails.troubleshooting && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">トラブルシューティング:</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {connectionDetails.troubleshooting.map((item: string, index: number) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {connectionStatus === "error" && !config.useMockData && (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>推奨:</strong>{" "}
                            VCMサーバーが利用できない場合は、デモモードを使用してシステムの機能をテストできます。
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseMockDataChange(true)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            デモモードに切り替える
                          </Button>
                        </div>
                      )}
                    </div>
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

              {!config.enabled && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>連携が無効です</AlertTitle>
                  <AlertDescription>
                    同期を実行するには、まず「接続設定」タブでVCM連携を有効にしてください。
                  </AlertDescription>
                </Alert>
              )}

              {syncResult && (
                <Alert variant={syncResult.success ? "default" : "destructive"}>
                  {syncResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle>{syncResult.success ? "同期完了" : "同期エラー"}</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-3">
                      {syncResult.success ? (
                        <div>
                          <p>{`${syncResult.synced}個のクレデンシャルタイプを同期しました。`}</p>
                          {syncResult.mode && <p className="text-sm text-gray-600">モード: {syncResult.mode}</p>}
                        </div>
                      ) : (
                        <div>
                          <p>同期中にエラーが発生しました：</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {syncResult.errors.map((error: string, index: number) => (
                              <li key={index} className="text-sm">
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* リクエスト詳細情報 */}
                      {syncResult.requestDetails && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium">リクエスト詳細</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <div className="space-y-2">
                              <div>
                                <strong>URL:</strong> {syncResult.requestDetails.url}
                              </div>
                              <div>
                                <strong>メソッド:</strong> {syncResult.requestDetails.method}
                              </div>
                              <div>
                                <strong>レスポンスステータス:</strong> {syncResult.requestDetails.responseStatus}
                              </div>
                              <div>
                                <strong>レスポンス時間:</strong> {syncResult.requestDetails.responseTime}ms
                              </div>
                              <div>
                                <strong>パラメータ:</strong>
                                <pre className="mt-1 text-xs bg-white p-2 rounded border">
                                  {JSON.stringify(syncResult.requestDetails.params, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </details>
                      )}

                      {/* デバッグ情報 */}
                      {syncResult.debugInfo && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium">デバッグ情報</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(syncResult.debugInfo, null, 2)}</pre>
                          </div>
                        </details>
                      )}

                      {/* エラー詳細情報 */}
                      {syncResult.errorDetails && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium">詳細なエラー情報</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <div className="space-y-2">
                              <div>
                                <strong>エラータイプ:</strong> {syncResult.errorDetails.type}
                              </div>
                              {syncResult.errorDetails.httpStatus && (
                                <div>
                                  <strong>HTTPステータス:</strong> {syncResult.errorDetails.httpStatus}
                                </div>
                              )}
                              {syncResult.errorDetails.errorMessage && (
                                <div>
                                  <strong>エラーメッセージ:</strong> {syncResult.errorDetails.errorMessage}
                                </div>
                              )}
                              {syncResult.errorDetails.connectionDetails && (
                                <div>
                                  <strong>接続先:</strong> {syncResult.errorDetails.connectionDetails.endpoint}
                                  <div className="mt-1">
                                    <strong>リクエストヘッダー:</strong>
                                    <pre className="mt-1 text-xs bg-white p-2 rounded border">
                                      {JSON.stringify(syncResult.errorDetails.connectionDetails.headers, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              {syncResult.errorDetails.responseTime && (
                                <div>
                                  <strong>レスポンス時間:</strong> {syncResult.errorDetails.responseTime}ms
                                </div>
                              )}
                              {syncResult.errorDetails.stack && (
                                <div>
                                  <strong>スタックトレース:</strong>
                                  <pre className="mt-1 text-xs bg-white p-2 rounded border whitespace-pre-wrap">
                                    {syncResult.errorDetails.stack}
                                  </pre>
                                </div>
                              )}
                              {syncResult.errorDetails.troubleshooting && (
                                <div>
                                  <strong>トラブルシューティング:</strong>
                                  <ul className="list-disc list-inside ml-4 mt-1">
                                    {syncResult.errorDetails.troubleshooting.map((item: string, index: number) => (
                                      <li key={index}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
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
                <Badge
                  variant={
                    config.enabled && (config.useMockData || (!!config.baseUrl && !!config.apiKey))
                      ? "default"
                      : "destructive"
                  }
                >
                  {config.enabled && (config.useMockData || (!!config.baseUrl && !!config.apiKey))
                    ? "設定完了"
                    : "設定不完全"}
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

              {config.useMockData && (
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
