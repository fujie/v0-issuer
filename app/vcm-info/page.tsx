"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Database,
  Settings,
  CheckCircle,
  ArrowRight,
  FileText,
  Users,
  Lock,
  Globe,
  Smartphone,
} from "lucide-react"
import Link from "next/link"

export default function VCMInfoPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">VCM（Verifiable Credential Management）</h1>
          <p className="text-xl text-gray-600">検証可能な資格情報を管理するための統合プラットフォーム</p>
        </div>

        {/* 概要 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              VCMとは
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              VCM（Verifiable Credential
              Management）は、デジタル証明書の発行、管理、検証を行うための包括的なシステムです。
              学生証明書、成績証明書、卒業証明書などの教育機関の証明書をデジタル化し、
              安全で検証可能な形式で管理することができます。
            </p>
          </CardContent>
        </Card>

        {/* 主要機能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-green-600" />
                証明書テンプレート管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                様々な種類の証明書テンプレートを作成・管理し、 必要に応じてカスタマイズできます。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-red-600" />
                選択的開示
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                SD-JWT技術により、必要な情報のみを選択的に開示し、 プライバシーを保護します。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-blue-600" />
                標準準拠
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                OpenID4VCI、W3C Verifiable Credentialsなどの 国際標準に準拠しています。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-purple-600" />
                統合管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                複数の証明書タイプを一元管理し、 効率的な発行・更新プロセスを提供します。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-orange-600" />
                モバイル対応
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                QRコードによる証明書の受け取りと、 モバイルウォレットでの管理が可能です。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-teal-600" />
                ユーザーフレンドリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                直感的なインターフェースで、 技術的な知識がなくても簡単に利用できます。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* システム構成 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>システム構成</CardTitle>
            <CardDescription>VCMシステムの主要コンポーネント</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Issuer
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">証明書発行者</h4>
                  <p className="text-sm text-gray-600">教育機関や組織が証明書を発行するためのシステム</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Holder
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">証明書保持者</h4>
                  <p className="text-sm text-gray-600">学生や個人が証明書を受け取り、管理するためのウォレット</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    Verifier
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">証明書検証者</h4>
                  <p className="text-sm text-gray-600">企業や機関が証明書の真正性を検証するためのシステム</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使用例 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>使用例</CardTitle>
            <CardDescription>VCMシステムの実際の活用シーン</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-lg">教育機関での活用</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    学生証のデジタル化
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    成績証明書の即座発行
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    卒業証明書の偽造防止
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    国際的な証明書交換
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-lg">企業での活用</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    採用時の学歴確認
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    資格証明の自動検証
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    従業員の継続教育記録
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    コンプライアンス管理
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/vcm-debug">
            <Button className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              VCMデバッグ情報
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/admin">
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              管理画面
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="secondary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              ダッシュボード
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
