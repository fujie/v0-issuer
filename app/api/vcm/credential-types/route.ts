import { type NextRequest, NextResponse } from "next/server"

// 完全にサーバーサイド専用の実装 - localStorage は一切使用しない

// フォールバック用のモックデータ
const FALLBACK_CREDENTIAL_TYPES = [
  {
    id: "fallback-student-id",
    name: "学生証（フォールバック）",
    description: "VCM接続失敗時のフォールバックデータ",
    version: "1.0.0",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        studentId: {
          type: "string",
          title: "学籍番号",
          description: "学生の学籍番号",
        },
        name: {
          type: "string",
          title: "氏名",
          description: "学生の氏名",
        },
        email: {
          type: "string",
          title: "メールアドレス",
          description: "学生のメールアドレス",
          format: "email",
        },
        department: {
          type: "string",
          title: "学部",
          description: "所属学部",
        },
        year: {
          type: "integer",
          title: "学年",
          description: "現在の学年",
        },
      },
      required: ["studentId", "name"],
      additionalProperties: false,
    },
    display: {
      name: "学生証（フォールバック）",
      description: "VCM接続失敗時のフォールバックデータ",
      locale: "ja-JP",
      backgroundColor: "#6b7280",
      textColor: "#ffffff",
    },
    issuanceConfig: {
      validityPeriod: 365,
      issuer: "https://fallback.example.com",
      context: ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "StudentIDCredential"],
      revocable: true,
      batchIssuance: false,
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    id: "fallback-course-completion",
    name: "コース修了証（フォールバック）",
    description: "コース修了証明書のフォールバックデータ",
    version: "1.0.0",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        studentId: {
          type: "string",
          title: "学籍番号",
          description: "学生の学籍番号",
        },
        courseName: {
          type: "string",
          title: "コース名",
          description: "修了したコース名",
        },
        completionDate: {
          type: "string",
          title: "修了日",
          description: "コース修了日",
          format: "date",
        },
        grade: {
          type: "string",
          title: "成績",
          description: "取得成績",
          enum: ["A", "B", "C", "D", "F"],
        },
      },
      required: ["studentId", "courseName", "completionDate"],
      additionalProperties: false,
    },
    display: {
      name: "コース修了証（フォールバック）",
      description: "コース修了証明書のフォールバックデータ",
      locale: "ja-JP",
      backgroundColor: "#059669",
      textColor: "#ffffff",
    },
    issuanceConfig: {
      validityPeriod: 1095,
      issuer: "https://fallback.example.com",
      context: ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "CourseCompletionCredential"],
      revocable: false,
      batchIssuance: true,
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseUrl = searchParams.get("baseUrl")
    const apiKey = searchParams.get("apiKey")
    const useMockData = searchParams.get("useMockData") === "true"

    // パラメータの検証
    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "baseUrlとapiKeyが必要です",
          error: "MISSING_PARAMETERS",
        },
        { status: 400 },
      )
    }

    // デモモードの場合はフォールバックデータを返す
    if (useMockData) {
      return NextResponse.json({
        success: true,
        credentialTypes: FALLBACK_CREDENTIAL_TYPES,
        message: "デモモード: フォールバックデータを使用",
        mode: "demo",
      })
    }

    // 実際のVCM APIへの接続を試行
    try {
      const vcmEndpoint = `${baseUrl}/api/credential-types`

      const response = await fetch(vcmEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Student-Login-Site/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        // VCM APIエラー
        return NextResponse.json({
          success: true,
          credentialTypes: FALLBACK_CREDENTIAL_TYPES,
          message: `VCM APIエラー (${response.status}). フォールバックデータを使用しています。`,
          mode: "fallback",
          errorDetails: {
            type: "VCM_API_ERROR",
            httpStatus: response.status,
            httpStatusText: response.statusText,
          },
        })
      }

      const responseText = await response.text()
      let vcmData

      try {
        vcmData = JSON.parse(responseText)
      } catch (parseError) {
        return NextResponse.json({
          success: true,
          credentialTypes: FALLBACK_CREDENTIAL_TYPES,
          message: "VCM APIのレスポンスが無効なJSON形式でした。フォールバックデータを使用しています。",
          mode: "fallback",
          errorDetails: {
            type: "INVALID_JSON_RESPONSE",
          },
        })
      }

      const credentialTypes = vcmData.credentialTypes || vcmData.data || []

      if (Array.isArray(credentialTypes) && credentialTypes.length > 0) {
        return NextResponse.json({
          success: true,
          credentialTypes: credentialTypes,
          message: `VCM APIから${credentialTypes.length}個のクレデンシャルタイプを取得しました`,
          mode: "vcm",
        })
      } else {
        return NextResponse.json({
          success: true,
          credentialTypes: FALLBACK_CREDENTIAL_TYPES,
          message: "VCM APIからデータが取得できませんでした。フォールバックデータを使用しています。",
          mode: "fallback",
          errorDetails: {
            type: "EMPTY_OR_INVALID_DATA",
          },
        })
      }
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error"

      return NextResponse.json({
        success: true,
        credentialTypes: FALLBACK_CREDENTIAL_TYPES,
        message: `VCM API接続エラー: ${errorMessage}. フォールバックデータを使用しています。`,
        mode: "fallback",
        errorDetails: {
          type: "NETWORK_ERROR",
          errorMessage,
        },
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "クレデンシャルタイプの取得中にエラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, apiKey, useMockData } = body

    // GETと同じロジックを使用するため、URLパラメータに変換
    const url = new URL(request.url)
    url.searchParams.set("baseUrl", baseUrl)
    url.searchParams.set("apiKey", apiKey)
    url.searchParams.set("useMockData", useMockData?.toString() || "false")

    const getRequest = new Request(url.toString(), {
      method: "GET",
      headers: request.headers,
    })

    return GET(getRequest as NextRequest)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "クレデンシャルタイプの取得中にエラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
