import { type NextRequest, NextResponse } from "next/server"

interface VCMCredentialType {
  id: string
  name: string
  description: string
  version: string
  schema: {
    $schema: string
    type: string
    properties: Record<string, any>
    required: string[]
    additionalProperties: boolean
  }
  display: {
    name: string
    description: string
    locale: string
    backgroundColor?: string
    textColor?: string
    logo?: {
      url: string
      altText: string
    }
  }
  issuanceConfig: {
    validityPeriod: number
    issuer: string
    context: string[]
    type: string[]
    revocable: boolean
    batchIssuance: boolean
    signingAlgorithm?: string
    keyId?: string
  }
  createdAt: string
  updatedAt: string
  status: "active" | "draft" | "deprecated"
  organizationId?: string
}

interface SyncRequest {
  credentialTypes: VCMCredentialType[]
  source: string
  timestamp: string
}

// VCMからのクレデンシャルタイプ同期を受け取るAPI
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid authorization header",
        },
        { status: 401 },
      )
    }

    const apiKey = authHeader.replace("Bearer ", "")

    // APIキーの検証（Student Login Site用のキー）
    if (!apiKey || !apiKey.startsWith("sl_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key format",
        },
        { status: 401 },
      )
    }

    const body: SyncRequest = await request.json()
    const { credentialTypes, source, timestamp } = body

    if (!credentialTypes || !Array.isArray(credentialTypes)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credential types data",
        },
        { status: 400 },
      )
    }

    console.log(`Received sync request from ${source} at ${timestamp}`)
    console.log(`Syncing ${credentialTypes.length} credential types`)

    // クレデンシャルタイプをローカルストレージに保存
    const syncResults = []
    const errors = []

    for (const vcmType of credentialTypes) {
      try {
        const localTemplate = convertVCMTypeToLocalTemplate(vcmType)
        await saveLocalCredentialType(localTemplate)
        syncResults.push({
          id: vcmType.id,
          name: vcmType.name,
          status: "synced",
        })
      } catch (error) {
        console.error(`Failed to sync credential type ${vcmType.id}:`, error)
        errors.push({
          id: vcmType.id,
          name: vcmType.name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const response = {
      success: true,
      data: {
        syncedCount: syncResults.length,
        errorCount: errors.length,
        syncResults,
        errors,
        timestamp: new Date().toISOString(),
        source: source || "unknown",
      },
    }

    console.log(`Sync completed: ${syncResults.length} synced, ${errors.length} errors`)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Credential types sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process sync request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// VCMクレデンシャルタイプをローカルテンプレート形式に変換
function convertVCMTypeToLocalTemplate(vcmType: VCMCredentialType) {
  const properties = vcmType.schema?.properties || {}
  const required = vcmType.schema?.required || []

  const claims = Object.entries(properties).map(([key, property]) => ({
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

// スキーマタイプをクレームタイプにマッピング
function mapSchemaTypeToClaimType(schemaType: string, format?: string): string {
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

// ローカルストレージにクレデンシャルタイプを保存
async function saveLocalCredentialType(template: any): Promise<void> {
  // 実際の実装では、データベースに保存する
  // ここではローカルストレージのシミュレーションとして処理

  // 既存のテンプレートを取得
  const existingTemplates = getLocalTemplates()

  // 同じIDのテンプレートを更新または追加
  const updatedTemplates = existingTemplates.filter((t) => t.id !== template.id)
  updatedTemplates.push(template)

  // 保存（実際の実装ではデータベースに保存）
  console.log(`Saved credential type template: ${template.id}`)
}

// ローカルテンプレートを取得（実際の実装ではデータベースから取得）
function getLocalTemplates(): any[] {
  // 実際の実装では、データベースから取得
  return []
}

// 同期状況を取得するGETエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")

    // 同期されたクレデンシャルタイプの情報を返す
    const syncInfo = {
      lastSync: new Date().toISOString(),
      syncedCount: 0, // 実際の実装では、データベースから取得
      source: source || "all",
      status: "ready",
    }

    return NextResponse.json({
      success: true,
      data: syncInfo,
    })
  } catch (error) {
    console.error("Get sync info error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get sync information",
      },
      { status: 500 },
    )
  }
}
