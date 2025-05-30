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
              department: {
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
                description: "入学年月日",
                selectiveDisclosure: true,
              },
            },
            required: ["studentId", "name", "department"],
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
            validityPeriod: 1460, // 4 years
            issuer: "https://university.example.com",
            context: ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "StudentIDCredential"],
            revocable: true,
            batchIssuance: false,
          },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          status: "active" as const,
        },
        {
          id: "academic-transcript",
          name: "成績証明書",
          description: "学業成績の証明書",
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
                description: "総合成績評価",
                selectiveDisclosure: true,
              },
              courses: {
                type: "array",
                title: "履修科目",
                description: "履修した科目一覧",
                selectiveDisclosure: true,
              },
              graduationDate: {
                type: "string",
                format: "date",
                title: "卒業予定日",
                description: "卒業予定年月日",
                selectiveDisclosure: true,
              },
            },
            required: ["studentId", "name"],
            additionalProperties: false,
          },
          display: {
            name: "成績証明書",
            description: "学業成績の証明書",
            locale: "ja-JP",
            backgroundColor: "#059669",
            textColor: "#ffffff",
          },
          issuanceConfig: {
            validityPeriod: 365, // 1 year
            issuer: "https://university.example.com",
            context: ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "AcademicTranscriptCredential"],
            revocable: false,
            batchIssuance: true,
          },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          status: "active" as const,
        },
      ]

      return NextResponse.json({
        success: true,
        credentialTypes: mockCredentialTypes,
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

    try {
      const credentialTypesEndpoint = `${baseUrl}/api/credential-types`
      console.log(`Fetching credential types from: ${credentialTypesEndpoint}`)

      const response = await fetch(credentialTypesEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Student-Login-Site/1.0",
        },
        signal: AbortSignal.timeout(10000), // 10 seconds
      })

      console.log(`Credential types response status: ${response.status}`)

      if (response.ok) {
        const result = await response.json()
        console.log("Credential types result:", result)

        return NextResponse.json({
          success: true,
          credentialTypes: result.credentialTypes || result.data || [],
          mode: "production",
        })
      } else {
        let errorMessage = `クレデンシャルタイプの取得に失敗しました (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = `クレデンシャルタイプの取得に失敗しました (${response.status}): ${errorData.error || response.statusText}`
        } catch (e) {
          // If we can't parse JSON, use status text
        }

        return NextResponse.json({
          success: false,
          message: errorMessage,
          statusCode: response.status,
        })
      }
    } catch (fetchError) {
      console.error("Failed to fetch credential types:", fetchError)
      return NextResponse.json({
        success: false,
        message: `クレデンシャルタイプの取得でエラーが発生しました: ${fetchError instanceof Error ? fetchError.message : "不明なエラー"}`,
        error: fetchError instanceof Error ? fetchError.name : "UnknownError",
      })
    }
  } catch (error) {
    console.error("Credential types API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `APIエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
