import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseUrl = searchParams.get("baseUrl")
    const apiKey = searchParams.get("apiKey")
    const useMockData = searchParams.get("useMockData") === "true"

    if (useMockData) {
      // Return mock credential types for demo mode
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate delay

      const mockCredentialTypes = [
        {
          id: "student-id-card",
          name: "学生証",
          description: "大学の学生証明書",
          version: "1.0.0",
          schema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              studentId: {
                type: "string",
                title: "学籍番号",
                description: "学生の学籍番号",
                selectiveDisclosure: false,
              },
              name: {
                type: "string",
                title: "氏名",
                description: "学生の氏名",
                selectiveDisclosure: true,
              },
              faculty: {
                type: "string",
                title: "学部",
                description: "所属学部",
                selectiveDisclosure: true,
              },
              year: {
                type: "integer",
                title: "学年",
                description: "現在の学年",
                selectiveDisclosure: true,
              },
              enrollmentDate: {
                type: "string",
                format: "date",
                title: "入学日",
                description: "入学した日付",
                selectiveDisclosure: true,
              },
            },
            required: ["studentId", "name", "faculty"],
            additionalProperties: false,
          },
          display: {
            name: "学生証",
            description: "大学の学生証明書",
            locale: "ja-JP",
            backgroundColor: "#1e40af",
            textColor: "#ffffff",
          },
          issuanceConfig: {
            validityPeriod: 365,
            issuer: "https://university.example.com",
            context: ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "StudentIDCredential"],
            revocable: true,
            batchIssuance: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active" as const,
        },
        {
          id: "academic-transcript",
          name: "成績証明書",
          description: "学術成績の証明書",
          version: "1.0.0",
          schema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              studentId: {
                type: "string",
                title: "学籍番号",
                description: "学生の学籍番号",
                selectiveDisclosure: false,
              },
              name: {
                type: "string",
                title: "氏名",
                description: "学生の氏名",
                selectiveDisclosure: true,
              },
              gpa: {
                type: "number",
                title: "GPA",
                description: "累積GPA",
                selectiveDisclosure: true,
              },
              courses: {
                type: "array",
                title: "履修科目",
                description: "履修した科目一覧",
                selectiveDisclosure: true,
              },
            },
            required: ["studentId", "name", "gpa"],
            additionalProperties: false,
          },
          display: {
            name: "成績証明書",
            description: "学術成績の証明書",
            locale: "ja-JP",
            backgroundColor: "#059669",
            textColor: "#ffffff",
          },
          issuanceConfig: {
            validityPeriod: 1095, // 3 years
            issuer: "https://university.example.com",
            context: ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "AcademicTranscriptCredential"],
            revocable: false,
            batchIssuance: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active" as const,
        },
      ]

      return NextResponse.json({
        success: true,
        credentialTypes: mockCredentialTypes,
        count: mockCredentialTypes.length,
        mode: "demo",
      })
    }

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Base URLとAPI Keyが必要です",
        },
        { status: 400 },
      )
    }

    // Try different credential types endpoints
    const credentialEndpoints = [
      { path: "/api/credential-types", method: "GET" },
      { path: "/api/v1/credential-types", method: "GET" },
      { path: "/credential-types", method: "GET" },
      { path: "/api/credentials/types", method: "GET" },
    ]

    for (const endpoint of credentialEndpoints) {
      try {
        const credentialTypesEndpoint = `${baseUrl}${endpoint.path}`
        console.log(`Trying credential types endpoint: ${endpoint.method} ${credentialTypesEndpoint}`)

        const response = await fetch(credentialTypesEndpoint, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "Student-Login-Site/1.0",
          },
          signal: AbortSignal.timeout(10000),
        })

        console.log(`Credential types endpoint response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log("Credential types data:", data)

          return NextResponse.json({
            success: true,
            credentialTypes: data.credentialTypes || data.types || data,
            count: (data.credentialTypes || data.types || data).length,
            endpoint: credentialTypesEndpoint,
            mode: "production",
          })
        } else if (response.status === 404) {
          console.log(`404 for ${credentialTypesEndpoint}, trying next endpoint`)
          continue
        } else {
          console.log(`Non-200 status ${response.status} for ${credentialTypesEndpoint}`)
          continue
        }
      } catch (endpointError) {
        console.log(`Error testing ${endpoint.method} ${endpoint.path}:`, endpointError)
        continue
      }
    }

    return NextResponse.json({
      success: false,
      message: "クレデンシャルタイプエンドポイントが見つかりません",
      troubleshooting: [
        "VCMサーバーが正しく起動しているか確認してください",
        "以下のエンドポイントが利用可能か確認してください:",
        "  - GET /api/credential-types",
        "  - GET /api/v1/credential-types",
        "  - GET /credential-types",
        "  - GET /api/credentials/types",
        "API Keyが正しく設定されているか確認してください",
      ],
      testedEndpoints: credentialEndpoints.map((e) => `${e.method} ${e.path}`),
    })
  } catch (error) {
    console.error("VCM credential types fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `クレデンシャルタイプの取得でエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
