"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CredentialTemplateManager } from "@/lib/credential-templates-enhanced"
import { VCMConfigManager } from "@/lib/vcm-config"
import { Cloud, HardDrive, RefreshCw, Settings, CheckCircle, AlertCircle, Info } from "lucide-react"
import Link from "next/link"

export function VCMStatusIndicator() {
  const [vcmConfig, setVcmConfig] = useState<any>(null)
  const [templateCounts, setTemplateCounts] = useState({
    total: 0,
    static: 0,
    vcm: 0,
  })
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStatus = async () => {
    setIsLoading(true)
    try {
      // VCM設定を取得
      const config = VCMConfigManager.getConfig()
      setVcmConfig(config)

      // 最終同期時刻を取得
      const syncTime = VCMConfigManager.getLastSync()
      setLastSync(syncTime)

      // テンプレート数を取得
      const templates = await CredentialTemplateManager.getAllTemplates()
      const staticCount = templates.filter((t) => t.source === "static").length
      const vcmCount = templates.filter((t) => t.source === "vcm").length

      setTemplateCounts({
        total: templates.length,
        static: staticCount,
        vcm: vcmCount,
      })
    } catch (error) {
      console.error("Failed to load VCM status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadStatus()
  }

  useEffect(() => {
    loadStatus()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">ステータスを読み込み中...</span>
      </div>
    )
  }

  const isVcmEnabled = vcmConfig?.enabled
  const hasVcmTemplates = templateCounts.vcm > 0

  return (
    <div className="space-y-4">
      {/* VCM接続ステータス */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={isVcmEnabled ? "default" : "secondary"} className="flex items-center space-x-1">
            <Cloud className="h-3 w-3" />
            <span>VCM連携</span>
          </Badge>
          <span className="text-sm text-gray-600">{isVcmEnabled ? "有効" : "無効"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              設定
            </Button>
          </Link>
        </div>
      </div>

      {/* テンプレート統計 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{templateCounts.total}</div>
          <div className="text-sm text-gray-500">総テンプレート数</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">{templateCounts.static}</div>
          <div className="text-sm text-blue-600 flex items-center justify-center">
            <HardDrive className="h-3 w-3 mr-1" />
            ローカル
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-900">{templateCounts.vcm}</div>
          <div className="text-sm text-green-600 flex items-center justify-center">
            <Cloud className="h-3 w-3 mr-1" />
            VCM
          </div>
        </div>
      </div>

      {/* ステータスメッセージ */}
      {!isVcmEnabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            VCM連携が無効になっています。管理画面でVCM設定を行うと、追加のクレデンシャルタイプを利用できます。
          </AlertDescription>
        </Alert>
      )}

      {isVcmEnabled && !hasVcmTemplates && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            VCM連携は有効ですが、同期されたテンプレートがありません。管理画面で「VCMから同期」を実行してください。
          </AlertDescription>
        </Alert>
      )}

      {isVcmEnabled && hasVcmTemplates && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            VCM連携が正常に動作しています。{templateCounts.vcm}個のテンプレートが同期されています。
            {lastSync && (
              <div className="mt-1 text-xs text-gray-500">最終同期: {new Date(lastSync).toLocaleString("ja-JP")}</div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
