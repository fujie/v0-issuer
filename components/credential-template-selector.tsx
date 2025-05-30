"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { type CredentialTemplate, getAvailableTemplates } from "@/lib/credential-templates"
import { FileText, Calendar, Shield, GraduationCap } from "lucide-react"

interface CredentialTemplateSelectorProps {
  onTemplateSelect: (templateId: string, selectedClaims: string[]) => void
  isLoading?: boolean
}

export function CredentialTemplateSelector({ onTemplateSelect, isLoading = false }: CredentialTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedClaims, setSelectedClaims] = useState<Record<string, string[]>>({})

  const templates = getAvailableTemplates()

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case "student-credential":
        return <Shield className="h-5 w-5" />
      case "academic-transcript":
        return <FileText className="h-5 w-5" />
      case "graduation-certificate":
        return <GraduationCap className="h-5 w-5" />
      case "enrollment-certificate":
        return <Calendar className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const handleTemplateSelect = (template: CredentialTemplate) => {
    setSelectedTemplate(template.id)

    // Initialize selected claims with all selective disclosure claims
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">証明書テンプレートを選択</h3>
        <div className="grid gap-4">
          {templates.map((template) => (
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
                      <CardTitle className="text-base">{template.display.name}</CardTitle>
                      <CardDescription className="text-sm">{template.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant="outline" className="text-xs">
                      有効期限: {formatValidityPeriod(template.validityPeriod)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {template.claims.filter((c) => c.selectiveDisclosure).length}個の選択的開示項目
                    </Badge>
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

                          {/* Required claims (always included) */}
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

                          {/* Selective disclosure claims */}
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

                          {/* Optional claims (non-selective disclosure) */}
                          {template.claims.some((claim) => !claim.required && !claim.selectiveDisclosure) && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-gray-700">その他の項目（常に含まれます）</h4>
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
        </div>
      </div>

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
