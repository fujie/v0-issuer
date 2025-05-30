"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, RefreshCw, FileText, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react"
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "deprecated">("all")
  const [useMockData, setUseMockData] = useState(true) // デフォルトでデモモードを有効に

  const loadCredentialTypes = async () => {
    const config = VCMConfigManager.getConfig()
    if (!config) {
      setError("VCM連携が設定されていません")
      return
    }

    // Enable the config for demo mode
    if (useMockData && !config.enabled) {
      config.enabled = true
      VCMConfigManager.saveConfig(config)
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use browser client that calls API routes
      const client = new VCMBrowserClient(config, useMockData)
      const types = await client.getCredentialTypes()
      setCredentialTypes(types)
      setFilteredTypes(types)
    } catch (err) {
      setError(err instanceof Error ? err.message : "クレデンシャルタイプの取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCredentialTypes()
  }, [useMockData])

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
          type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          type.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          type.id.toLowerCase().includes(searchTerm.toLowerCase()),
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
    return new Date(dateString).toLocaleDateString("ja-JP")
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
              <div className="flex items-center space-x-2">
                <Label htmlFor="use-mock-data" className="text-sm">
                  デモモード
                </Label>
                <input
                  id="use-mock-data"
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <Button onClick={loadCredentialTypes} disabled={isLoading} variant="outline">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {useMockData && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  デモモードが有効です。モックデータを使用してクレデンシャルタイプを表示しています。
                </AlertDescription>
              </Alert>
            )}

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

            {error && (
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
                          style={{ backgroundColor: type.display.backgroundColor }}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{type.display.name}</CardTitle>
                          <CardDescription className="text-sm">{type.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={`text-xs ${getStatusColor(type.status)}`}>
                          {getStatusIcon(type.status)}
                          <span className="ml-1">
                            {type.status === "active" && "アクティブ"}
                            {type.status === "draft" && "ドラフト"}
                            {type.status === "deprecated" && "非推奨"}
                          </span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          v{type.version}
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
                              <div className="font-mono">{type.id}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">バージョン</Label>
                              <div>{type.version}</div>
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
                            <div className="text-sm">{type.description}</div>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">クレデンシャルタイプ</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.issuanceConfig.type.map((t, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="schema" className="mt-4">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">プロパティ</Label>
                              <div className="mt-2 space-y-2">
                                {Object.entries(type.schema.properties).map(([key, property]) => (
                                  <div key={key} className="border rounded-md p-3 bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium text-sm">{property.title}</div>
                                      <div className="flex space-x-1">
                                        <Badge variant="outline" className="text-xs">
                                          {property.type}
                                        </Badge>
                                        {type.schema.required.includes(key) && (
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
                                    <div className="text-xs text-gray-600">{property.description}</div>
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
                                ))}
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="config" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-gray-500">有効期限</Label>
                                <div>{type.issuanceConfig.validityPeriod}日</div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">発行者</Label>
                                <div className="font-mono text-xs">{type.issuanceConfig.issuer}</div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">取り消し可能</Label>
                                <div>{type.issuanceConfig.revocable ? "はい" : "いいえ"}</div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">バッチ発行</Label>
                                <div>{type.issuanceConfig.batchIssuance ? "はい" : "いいえ"}</div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">コンテキスト</Label>
                              <div className="mt-1 space-y-1">
                                {type.issuanceConfig.context.map((context, index) => (
                                  <div key={index} className="text-xs font-mono bg-gray-100 p-2 rounded">
                                    {context}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">表示設定</Label>
                              <div className="mt-2 p-3 border rounded-md">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <Label className="text-xs text-gray-500">背景色</Label>
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="w-4 h-4 rounded border"
                                        style={{ backgroundColor: type.display.backgroundColor }}
                                      />
                                      <span className="font-mono">{type.display.backgroundColor}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500">文字色</Label>
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="w-4 h-4 rounded border"
                                        style={{ backgroundColor: type.display.textColor }}
                                      />
                                      <span className="font-mono">{type.display.textColor}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  )}
                </Card>
              ))}

              {filteredTypes.length === 0 && !isLoading && (
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
