"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronRight,
  Bug,
} from "lucide-react"
import { VCMBrowserClient, type VCMCredentialType } from "@/lib/vcm-client-browser"
import { VCMConfigManager } from "@/lib/vcm-config"

interface VCMCredentialBrowserProps {
  onCredentialTypeSelect?: (credentialType: VCMCredentialType) => void
}

export function VCMCredentialBrowser({ onCredentialTypeSelect }: VCMCredentialBrowserProps) {
  const [credentialTypes, setCredentialTypes] = useState<VCMCredentialType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<VCMCredentialType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<VCMCredentialType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const [connectionMode, setConnectionMode] = useState<string>("unknown")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "deprecated">("all")
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})

  const loadCredentialTypes = async () => {
    console.log("=== loadCredentialTypes START ===")
    console.log("VCMConfigManager debug info:", VCMConfigManager.debugInfo())

    const config = VCMConfigManager.getConfig()
    console.log("Config loaded:", config)

    const debugData = {
      configExists: !!config,
      configEnabled: config?.enabled,
      configUseMockData: config?.useMockData,
      configHasBaseUrl: !!config?.baseUrl,
      configHasApiKey: !!config?.apiKey,
      timestamp: new Date().toISOString(),
    }
    setDebugInfo(debugData)
    console.log("Debug data:", debugData)

    if (!config) {
      console.log("No config found, setting error")
      setError("VCM連携が設定されていません")
      setErrorDetails(null)
      return
    }

    if (!config.enabled) {
      console.log("Config disabled, setting error")
      setError("VCM連携が有効になっていません。管理画面で連携を有効にしてください。")
      setErrorDetails(null)
      return
    }

    // デモモードまたは実際の設定が完了している場合のみ続行
    const isProperlyConfigured = config.useMockData || (!!config.baseUrl && !!config.apiKey)
    if (!isProperlyConfigured) {
      console.log("Config incomplete, setting error")
      setError("VCM連携の設定が不完全です。Base URLとAPI Keyを設定するか、デモモードを有効にしてください。")
      setErrorDetails(null)
      return
    }

    console.log("Configuration is valid, starting data load")
    setIsLoading(true)
    setError(null)
    setErrorDetails(null)
    setConnectionMode("loading")

    try {
      console.log("Creating VCMBrowserClient")
      const client = new VCMBrowserClient(config, config.useMockData ?? false)

      console.log("Calling getCredentialTypes")
      const types = await client.getCredentialTypes()

      console.log("Credential types received:", types)
      console.log("Number of types:", types.length)
      console.log("Types data:", JSON.stringify(types, null, 2))

      // 状態を更新
      console.log("Setting credentialTypes state")
      setCredentialTypes(types)

      console.log("Setting filteredTypes state")
      setFilteredTypes(types)

      console.log("Setting connectionMode to success")
      setConnectionMode("success")

      // デバッグ情報を更新
      setDebugInfo((prev) => ({
        ...prev,
        typesReceived: types.length,
        typesData: types.map((t) => ({ id: t.id, name: t.name })),
        loadSuccess: true,
      }))
    } catch (err) {
      console.error("Error in loadCredentialTypes:", err)

      setConnectionMode("error")
      setError(err instanceof Error ? err.message : "クレデンシャルタイプの取得に失敗しました")

      setDebugInfo((prev) => ({
        ...prev,
        loadError: err instanceof Error ? err.message : "Unknown error",
        loadSuccess: false,
      }))
    } finally {
      console.log("Setting isLoading to false")
      setIsLoading(false)
      console.log("=== loadCredentialTypes END ===")
    }
  }

  useEffect(() => {
    console.log("=== Initial useEffect triggered ===")
    loadCredentialTypes()
  }, [])

  useEffect(() => {
    console.log("=== Filter useEffect triggered ===")
    console.log("credentialTypes:", credentialTypes.length)
    console.log("searchTerm:", searchTerm)
    console.log("statusFilter:", statusFilter)

    let filtered = credentialTypes

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((type) => type.status === statusFilter)
      console.log("After status filter:", filtered.length)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (type) =>
          (type.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (type.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (type.id || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
      console.log("After search filter:", filtered.length)
    }

    console.log("Setting filteredTypes to:", filtered.length)
    setFilteredTypes(filtered)
  }, [credentialTypes, searchTerm, statusFilter])

  const handleTypeSelect = (type: VCMCredentialType) => {
    console.log("Type selected:", type.id)
    setSelectedType(type)
    onCredentialTypeSelect?.(type)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "deprecated":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "draft":
        return <AlertCircle className="h-3 w-3" />
      case "deprecated":
        return <AlertCircle className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "不明"
    try {
      return new Date(dateString).toLocaleDateString("ja-JP")
    } catch {
      return "不明"
    }
  }

  const config = VCMConfigManager.getConfig()
  const isConfigured = config && config.enabled && (config.useMockData || (!!config.baseUrl && !!config.apiKey))

  console.log("=== Render State ===")
  console.log("isConfigured:", isConfigured)
  console.log("isLoading:", isLoading)
  console.log("error:", error)
  console.log("connectionMode:", connectionMode)
  console.log("credentialTypes.length:", credentialTypes.length)
  console.log("filteredTypes.length:", filteredTypes.length)
  console.log("==================")

  const getDisplayName = (type: VCMCredentialType) => {
    return type.display?.name || type.name || type.id || "名前なし"
  }

  const getBackgroundColor = (type: VCMCredentialType) => {
    return type.display?.backgroundColor || "#3b82f6"
  }

  const getTextColor = (type: VCMCredentialType) => {
    return type.display?.textColor || "#ffffff"
  }

  const getCredentialTypes = (type: VCMCredentialType) => {
    return type.issuanceConfig?.type || []
  }

  const getValidityPeriod = (type: VCMCredentialType) => {
    return type.issuanceConfig?.validityPeriod || "不明"
  }

  const getIssuer = (type: VCMCredentialType) => {
    return type.issuanceConfig?.issuer || "不明"
  }

  const getRevocable = (type: VCMCredentialType) => {
    return type.issuanceConfig?.revocable ?? false
  }

  const getBatchIssuance = (type: VCMCredentialType) => {
    return type.issuanceConfig?.batchIssuance ?? false
  }

  const getContext = (type: VCMCredentialType) => {
    return type.issuanceConfig?.context || []
  }

  const getSchemaProperties = (type: VCMCredentialType) => {
    return type.schema?.properties || {}
  }

  const getRequiredFields = (type: VCMCredentialType) => {
    return type.schema?.required || []
  }

  const renderErrorDetails = () => {
    if (!errorDetails) return null

    return (
      <Collapsible open={showErrorDetails} onOpenChange={setShowErrorDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full mt-2">
            {showErrorDetails ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
            <Bug className="h-4 w-4 mr-2" />
            エラーの詳細を表示
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="bg-gray-50 p-4 rounded-md text-sm space-y-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">エラータイプ</Label>
              <div className="font-mono text-red-600">{errorDetails.type}</div>
            </div>

            {errorDetails.errorMessage && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">エラーメッセージ</Label>
                <div className="text-red-600">{errorDetails.errorMessage}</div>
              </div>
            )}

            {errorDetails.httpStatus && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">HTTPステータス</Label>
                <div className="font-mono">
                  {errorDetails.httpStatus} {errorDetails.httpStatusText}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                VCM クレデンシャルタイプ
              </CardTitle>
              <CardDescription>
                Verifiable Credential Managerで定義されたクレデンシャルタイプを参照・選択できます
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={loadCredentialTypes} disabled={isLoading} variant="outline">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* デバッグ情報セクション */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Bug className="h-4 w-4 mr-2" />
                  デバッグ情報を表示
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2">
                  <div>
                    <strong>設定状況:</strong> {isConfigured ? "有効" : "無効"}
                  </div>
                  <div>
                    <strong>ローディング状態:</strong> {isLoading ? "読み込み中" : "完了"}
                  </div>
                  <div>
                    <strong>接続モード:</strong> {connectionMode}
                  </div>
                  <div>
                    <strong>エラー:</strong> {error || "なし"}
                  </div>
                  <div>
                    <strong>取得したタイプ数:</strong> {credentialTypes.length}
                  </div>
                  <div>
                    <strong>フィルタ後タイプ数:</strong> {filteredTypes.length}
                  </div>
                  <div>
                    <strong>検索条件:</strong> {searchTerm || "なし"}
                  </div>
                  <div>
                    <strong>ステータスフィルタ:</strong> {statusFilter}
                  </div>
                  <div className="mt-2">
                    <strong>詳細デバッグ情報:</strong>
                    <pre className="bg-white p-2 rounded border text-xs overflow-auto max-h-32">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {!isConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>VCM連携が設定されていません。管理画面でVCM連携を設定してください。</AlertDescription>
              </Alert>
            )}

            {connectionMode === "success" && config?.useMockData && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  デモモードが有効です。モックデータを使用してクレデンシャルタイプを表示しています。
                </AlertDescription>
              </Alert>
            )}

            {connectionMode === "fallback" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>VCM接続エラー</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{error}</p>
                    {errorDetails && renderErrorDetails()}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {connectionMode === "success" && !config?.useMockData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>VCMサーバーに正常に接続し、クレデンシャルタイプを取得しました。</AlertDescription>
              </Alert>
            )}

            {/* 設定が有効で、エラーがない場合のみ表示 */}
            {isConfigured && !error && (
              <>
                {/* Search and Filter */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search">検索</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="名前、説明、IDで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status-filter">ステータス</Label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="all">すべて</option>
                      <option value="active">アクティブ</option>
                      <option value="draft">ドラフト</option>
                      <option value="deprecated">非推奨</option>
                    </select>
                  </div>
                </div>

                {/* Credential Types List */}
                <div className="grid gap-4">
                  {isLoading && (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                      <p className="text-gray-500">クレデンシャルタイプを読み込み中...</p>
                    </div>
                  )}

                  {!isLoading && filteredTypes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm || statusFilter !== "all"
                        ? "検索条件に一致するクレデンシャルタイプが見つかりません"
                        : "クレデンシャルタイプが見つかりません"}
                    </div>
                  )}

                  {!isLoading &&
                    filteredTypes.map((type) => (
                      <Card
                        key={type.id}
                        className={`cursor-pointer transition-all hover:bg-gray-50 ${
                          selectedType?.id === type.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                        }`}
                        onClick={() => handleTypeSelect(type)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="p-2 rounded-md text-white"
                                style={{ backgroundColor: getBackgroundColor(type) }}
                              >
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{getDisplayName(type)}</CardTitle>
                                <CardDescription className="text-sm">{type.description || "説明なし"}</CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge className={`text-xs ${getStatusColor(type.status || "unknown")}`}>
                                {getStatusIcon(type.status || "unknown")}
                                <span className="ml-1">
                                  {type.status === "active" && "アクティブ"}
                                  {type.status === "draft" && "ドラフト"}
                                  {type.status === "deprecated" && "非推奨"}
                                  {!type.status && "不明"}
                                </span>
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                v{type.version || "1.0"}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>

                        {selectedType?.id === type.id && (
                          <CardContent className="pt-0">
                            <Tabs defaultValue="overview" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">概要</TabsTrigger>
                                <TabsTrigger value="schema">スキーマ</TabsTrigger>
                                <TabsTrigger value="config">設定</TabsTrigger>
                              </TabsList>

                              <TabsContent value="overview" className="mt-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-xs text-gray-500">ID</Label>
                                    <div className="font-mono">{type.id || "不明"}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">バージョン</Label>
                                    <div>{type.version || "1.0"}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">作成日</Label>
                                    <div>{formatDate(type.createdAt)}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">更新日</Label>
                                    <div>{formatDate(type.updatedAt)}</div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs text-gray-500">説明</Label>
                                  <div className="text-sm">{type.description || "説明なし"}</div>
                                </div>

                                <div>
                                  <Label className="text-xs text-gray-500">クレデンシャルタイプ</Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {getCredentialTypes(type).length > 0 ? (
                                      getCredentialTypes(type).map((t, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {t}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        未設定
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="schema" className="mt-4">
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-sm font-medium">プロパティ</Label>
                                    <div className="mt-2 space-y-2">
                                      {Object.keys(getSchemaProperties(type)).length > 0 ? (
                                        Object.entries(getSchemaProperties(type)).map(([key, property]) => (
                                          <div key={key} className="border rounded-md p-3 bg-gray-50">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="font-medium text-sm">{property.title || key}</div>
                                              <div className="flex space-x-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {property.type || "unknown"}
                                                </Badge>
                                                {getRequiredFields(type).includes(key) && (
                                                  <Badge variant="destructive" className="text-xs">
                                                    必須
                                                  </Badge>
                                                )}
                                                {property.selectiveDisclosure && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    選択的開示
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {property.description || "説明なし"}
                                            </div>
                                            {property.enum && (
                                              <div className="mt-2">
                                                <Label className="text-xs text-gray-500">選択肢:</Label>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {property.enum.map((value, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                      {value}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-4 text-gray-500">
                                          スキーマプロパティが定義されていません
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="config" className="mt-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label className="text-xs text-gray-500">有効期限</Label>
                                      <div>{getValidityPeriod(type)}日</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500">発行者</Label>
                                      <div className="font-mono text-xs">{getIssuer(type)}</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500">取り消し可能</Label>
                                      <div>{getRevocable(type) ? "はい" : "いいえ"}</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500">バッチ発行</Label>
                                      <div>{getBatchIssuance(type) ? "はい" : "いいえ"}</div>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs text-gray-500">コンテキスト</Label>
                                    <div className="mt-1 space-y-1">
                                      {getContext(type).length > 0 ? (
                                        getContext(type).map((context, index) => (
                                          <div key={index} className="text-xs font-mono bg-gray-100 p-2 rounded">
                                            {context}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-gray-500 p-2">
                                          コンテキストが設定されていません
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {type.display && (
                                    <div>
                                      <Label className="text-xs text-gray-500">表示設定</Label>
                                      <div className="mt-2 p-3 border rounded-md">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <Label className="text-xs text-gray-500">背景色</Label>
                                            <div className="flex items-center space-x-2">
                                              <div
                                                className="w-4 h-4 rounded border"
                                                style={{ backgroundColor: getBackgroundColor(type) }}
                                              />
                                              <span className="font-mono">{getBackgroundColor(type)}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-500">文字色</Label>
                                            <div className="flex items-center space-x-2">
                                              <div
                                                className="w-4 h-4 rounded border"
                                                style={{ backgroundColor: getTextColor(type) }}
                                              />
                                              <span className="font-mono">{getTextColor(type)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                </div>
              </>
            )}

            {/* エラーがある場合の表示 */}
            {error && connectionMode !== "fallback" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
