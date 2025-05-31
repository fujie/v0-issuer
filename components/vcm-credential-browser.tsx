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

  const loadCredentialTypes = async () => {
    const config = VCMConfigManager.getConfig()
    if (!config) {
      setError("VCM連携が設定されていません")
      setErrorDetails(null)
      return
    }

    if (!config.enabled) {
      setError("VCM連携が有効になっていません。管理画面で連携を有効にしてください。")
      setErrorDetails(null)
      return
    }

    setIsLoading(true)
    setError(null)
    setErrorDetails(null)
    setConnectionMode("unknown")

    try {
      // Use browser client that calls API routes
      const client = new VCMBrowserClient(config, config.useMockData ?? false)
      const types = await client.getCredentialTypes()
      setCredentialTypes(types)
      setFilteredTypes(types)
      setConnectionMode("success")
    } catch (err) {
      console.error("Failed to load credential types:", err)

      // エラーの詳細情報を取得
      if (err instanceof Error && err.message.includes("フォールバック")) {
        setConnectionMode("fallback")
        setError("VCM接続に失敗しました。フォールバックデータを使用しています。")

        // APIから詳細なエラー情報を取得
        try {
          const params = new URLSearchParams({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            useMockData: (config.useMockData ?? false).toString(),
          })

          const response = await fetch(`/api/vcm/credential-types?${params}`)
          const result = await response.json()

          if (result.errorDetails) {
            setErrorDetails(result.errorDetails)
          }
        } catch (detailError) {
          console.error("Failed to get error details:", detailError)
        }
      } else {
        setConnectionMode("error")
        setError(err instanceof Error ? err.message : "クレデンシャルタイプの取得に失敗しました")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCredentialTypes()
  }, [])

  useEffect(() => {
    let filtered = credentialTypes

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((type) => type.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (type) =>
          (type.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (type.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (type.id || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredTypes(filtered)
  }, [credentialTypes, searchTerm, statusFilter])

  const handleTypeSelect = (type: VCMCredentialType) => {
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
  const isConfigured = VCMConfigManager.isConfigured()

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

            {errorDetails.connectionDetails && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">接続詳細</Label>
                <div className="bg-white p-2 rounded border font-mono text-xs">
                  <div>
                    <strong>エンドポイント:</strong> {errorDetails.connectionDetails.endpoint}
                  </div>
                  <div>
                    <strong>メソッド:</strong> {errorDetails.connectionDetails.method}
                  </div>
                  <div>
                    <strong>タイムアウト:</strong> {errorDetails.connectionDetails.timeout}ms
                  </div>
                  <div>
                    <strong>タイムスタンプ:</strong> {errorDetails.connectionDetails.timestamp}
                  </div>
                </div>
              </div>
            )}

            {errorDetails.responseTime && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">レスポンス時間</Label>
                <div className="font-mono">{errorDetails.responseTime}ms</div>
              </div>
            )}

            {errorDetails.troubleshooting && errorDetails.troubleshooting.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">トラブルシューティング</Label>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {errorDetails.troubleshooting.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {errorDetails.suggestedActions && errorDetails.suggestedActions.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">推奨アクション</Label>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  {errorDetails.suggestedActions.map((action: string, index: number) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {errorDetails.errorText && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">レスポンス内容</Label>
                <div className="bg-white p-2 rounded border font-mono text-xs max-h-32 overflow-y-auto">
                  {errorDetails.errorText}
                </div>
              </div>
            )}

            {errorDetails.responseHeaders && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">レスポンスヘッダー</Label>
                <div className="bg-white p-2 rounded border font-mono text-xs max-h-32 overflow-y-auto">
                  {Object.entries(errorDetails.responseHeaders).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {value as string}
                    </div>
                  ))}
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
              <Button onClick={loadCredentialTypes} disabled={isLoading || !isConfigured} variant="outline">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>VCM連携が設定されていません。管理画面でVCM連携を設定してください。</AlertDescription>
              </Alert>
            )}

            {connectionMode === "demo" && isConfigured && (
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

            {isConfigured && (
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

                {error && connectionMode !== "fallback" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Credential Types List */}
                <div className="grid gap-4">
                  {filteredTypes.map((type) => (
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
                                      <div className="text-xs text-gray-500 p-2">コンテキストが設定されていません</div>
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

                  {filteredTypes.length === 0 && !isLoading && isConfigured && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm || statusFilter !== "all"
                        ? "検索条件に一致するクレデンシャルタイプが見つかりません"
                        : "クレデンシャルタイプが見つかりません"}
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                      <p className="text-gray-500">クレデンシャルタイプを読み込み中...</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
