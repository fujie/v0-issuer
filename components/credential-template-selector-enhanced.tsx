"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CredentialTemplateManager, type EnhancedCredentialTemplate } from "@/lib/credential-templates-enhanced"
import {
  FileText,
  Calendar,
  Shield,
  GraduationCap,
  RefreshCw,
  Cloud,
  HardDrive,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface CredentialTemplateSelectorEnhancedProps {
  onTemplateSelect: (templateId: string, selectedClaims: string[]) => void
  isLoading?: boolean
}

export function CredentialTemplateSelectorEnhanced({
  onTemplateSelect,
  isLoading = false,
}: CredentialTemplateSelectorEnhancedProps) {
  const [templates, setTemplates] = useState<EnhancedCredentialTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedClaims, setSelectedClaims] = useState<Record<string, string[]>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "static" | "vcm">("all")

  const loadTemplates = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const allTemplates = await CredentialTemplateManager.getAllTemplates()
      setTemplates(allTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : "テンプレートの読み込みに失敗しました")
    } finally {
      setIsRefreshing(false)
    }
  }

  const syncFromVCM = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const result = await CredentialTemplateManager.syncFromVCM()

      if (result.success) {
        await loadTemplates()
      } else {
        setError(`同期エラー: ${result.errors.join(", ")}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "VCMとの同期に失敗しました")
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case "student-credential":
      case "university-student-id":
        return <Shield className="h-5 w-5" />
      case "academic-transcript":
      case "academic-transcript-v2":
        return <FileText className="h-5 w-5" />
      case "graduation-certificate":
        return <GraduationCap className="h-5 w-5" />
      case "enrollment-certificate":
        return <Calendar className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getSourceIcon = (source: "static" | "vcm") => {
    return source === "vcm" ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />
  }

  const getSourceLabel = (source: "static" | "vcm") => {
    return source === "vcm" ? "VCM" : "ローカル"
  }

  const handleTemplateSelect = (template: EnhancedCredentialTemplate) => {
    setSelectedTemplate(template.id)

    const selectiveDisclosureClaims = template.claims
      .filter((claim) => claim.selectiveDisclosure)
      .map((claim) => claim.key)

    setSelectedClaims((prev) => ({
      ...prev,
      [template.id]: selectiveDisclosureClaims,
    }))
  }

  const handleClaimToggle = (templateId: string, claimKey: string) => {
    setSelectedClaims((prev) => {
      const templateClaims = prev[templateId] || []
      const isSelected = templateClaims.includes(claimKey)

      return {
        ...prev,
        [templateId]: isSelected ? templateClaims.filter((key) => key !== claimKey) : [...templateClaims, claimKey],
      }
    })
  }

  const handleIssue = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate, selectedClaims[selectedTemplate] || [])
    }
  }

  const formatValidityPeriod = (days: number): string => {
    if (days >= 365) {
      const years = Math.floor(days / 365)
      return `${years}年`
    } else if (days >= 30) {
      const months = Math.floor(days / 30)
      return `${months}ヶ月`
    } else {
      return `${days}日`
    }
  }

  const filteredTemplates = templates.filter((template) => {
    if (activeTab === "all") return true
    return template.source === activeTab
  })

  const staticCount = templates.filter((t) => t.source === "static").length
  const vcmCount = templates.filter((t) => t.source === "vcm").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">証明書テンプレートを選択</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={syncFromVCM} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
            VCMから同期
          </Button>
          <Button variant="outline" size="sm" onClick={loadTemplates} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            更新
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">すべて ({templates.length})</TabsTrigger>
          <TabsTrigger value="static">
            <HardDrive className="h-4 w-4 mr-1" />
            ローカル ({staticCount})
          </TabsTrigger>
          <TabsTrigger value="vcm">
            <Cloud className="h-4 w-4 mr-1" />
            VCM ({vcmCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-md text-white"
                        style={{ backgroundColor: template.display.backgroundColor }}
                      >
                        {getTemplateIcon(template.id)}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center">
                          {template.display.name}
                          <Badge
                            variant="outline"
                            className={`ml-2 text-xs ${
                              template.source === "vcm" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {getSourceIcon(template.source)}
                            <span className="ml-1">{getSourceLabel(template.source)}</span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">{template.description}</CardDescription>
                        {template.lastSynced && (
                          <div className="text-xs text-gray-500 mt-1">
                            最終同期: {new Date(template.lastSynced).toLocaleString("ja-JP")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="outline" className="text-xs">
                        有効期限: {formatValidityPeriod(template.validityPeriod)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.claims.filter((c) => c.selectiveDisclosure).length}個の選択的開示項目
                      </Badge>
                      {template.source === "vcm" && template.syncStatus && (
                        <Badge
                          variant={template.syncStatus === "synced" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {template.syncStatus === "synced" ? "同期済み" : "エラー"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {selectedTemplate === template.id && (
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="claims">
                        <AccordionTrigger className="text-sm">
                          開示する情報を選択 ({selectedClaims[template.id]?.length || 0}/
                          {template.claims.filter((c) => c.selectiveDisclosure).length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-3">
                              以下の項目から開示する情報を選択してください。選択した項目のみが証明書に含まれます。
                            </p>

                            <div>
                              <h4 className="text-sm font-medium mb-2 text-gray-700">必須項目（常に含まれます）</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {template.claims
                                  .filter((claim) => claim.required && !claim.selectiveDisclosure)
                                  .map((claim) => (
                                    <div
                                      key={claim.key}
                                      className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md"
                                    >
                                      <Checkbox checked disabled />
                                      <div className="flex-1">
                                        <Label className="text-sm font-medium text-gray-600">{claim.name}</Label>
                                        <p className="text-xs text-gray-500">{claim.description}</p>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        必須
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium mb-2 text-gray-700">選択的開示項目</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {template.claims
                                  .filter((claim) => claim.selectiveDisclosure)
                                  .map((claim) => (
                                    <div key={claim.key} className="flex items-center space-x-2 p-2 border rounded-md">
                                      <Checkbox
                                        id={`${template.id}-${claim.key}`}
                                        checked={selectedClaims[template.id]?.includes(claim.key) || false}
                                        onCheckedChange={() => handleClaimToggle(template.id, claim.key)}
                                      />
                                      <div className="flex-1">
                                        <Label
                                          htmlFor={`${template.id}-${claim.key}`}
                                          className="text-sm font-medium cursor-pointer"
                                        >
                                          {claim.name}
                                        </Label>
                                        <p className="text-xs text-gray-500">{claim.description}</p>
                                        {claim.enum && (
                                          <div className="mt-1">
                                            <p className="text-xs text-gray-400">選択肢: {claim.enum.join(", ")}</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex space-x-1">
                                        <Badge variant="outline" className="text-xs">
                                          {claim.type}
                                        </Badge>
                                        {claim.required && (
                                          <Badge variant="destructive" className="text-xs">
                                            必須
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {template.claims.some((claim) => !claim.required && !claim.selectiveDisclosure) && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-gray-700">
                                  その他の項目（常に含まれます）
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {template.claims
                                    .filter((claim) => !claim.required && !claim.selectiveDisclosure)
                                    .map((claim) => (
                                      <div
                                        key={claim.key}
                                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md"
                                      >
                                        <Checkbox checked disabled />
                                        <div className="flex-1">
                                          <Label className="text-sm font-medium text-gray-600">{claim.name}</Label>
                                          <p className="text-xs text-gray-500">{claim.description}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          任意
                                        </Badge>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                )}
              </Card>
            ))}

            {filteredTemplates.length === 0 && !isRefreshing && (
              <div className="text-center py-8 text-gray-500">
                {activeTab === "vcm"
                  ? "VCMから同期されたテンプレートがありません。「VCMから同期」ボタンをクリックして同期してください。"
                  : "テンプレートが見つかりません"}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectedTemplate && (
        <div className="flex justify-end">
          <Button
            onClick={handleIssue}
            disabled={isLoading || !selectedClaims[selectedTemplate]?.length}
            className="min-w-[200px]"
          >
            {isLoading ? "発行中..." : "選択した証明書を発行"}
          </Button>
        </div>
      )}
    </div>
  )
}
