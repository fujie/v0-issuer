import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IssueCredentialButton } from "@/components/issue-credential-button"
import { VCMStatusIndicator } from "@/components/vcm-status-indicator"
import Link from "next/link"
import { Settings, Shield } from "lucide-react"

export default async function Dashboard() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <header className="container mx-auto py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">学生証明書発行システム</h1>
          <div className="flex items-center space-x-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                管理画面
              </Button>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <Button variant="outline" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 py-6">
        <div className="grid gap-6">
          {/* VCM連携ステータス */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                VCM連携ステータス
              </CardTitle>
              <CardDescription>Verifiable Credential Manager (VCM) との連携状況</CardDescription>
            </CardHeader>
            <CardContent>
              <VCMStatusIndicator />
            </CardContent>
          </Card>

          {/* ユーザー情報 */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザー情報</CardTitle>
              <CardDescription>SAMLプロバイダから取得した情報</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">名前</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.user.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">学籍番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.user.studentId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">所属</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.user.department}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">認証状態</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      認証済み
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* 証明書発行 */}
          <Card>
            <CardHeader>
              <CardTitle>学生証明書の発行</CardTitle>
              <CardDescription>
                SD-JWT形式の学生証明書を発行できます。ローカルテンプレートとVCMから同期されたテンプレートの両方が利用可能です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">利用可能な証明書テンプレート：</p>
                  <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                    <li>ローカルテンプレート（学生証、成績証明書など）</li>
                    <li>VCMから同期されたテンプレート</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">発行される証明書には以下の情報が含まれます：</p>
                  <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                    <li>氏名</li>
                    <li>学籍番号</li>
                    <li>所属学部/学科</li>
                    <li>在籍状況</li>
                    <li>発行日時</li>
                    <li>選択的開示項目（テンプレートにより異なります）</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <IssueCredentialButton userId={session.user.id} />
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
