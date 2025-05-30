import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const baseUrl = searchParams.get("baseUrl")
    const apiKey = searchParams.get("apiKey")
    const useMockData = searchParams.get("useMockData") === "true"

    if (useMockData) {
      // Return mock data for demo mode
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockCredentialTypes = [
        {
          id: "university-student-id",
          name: "大学学生証",
          description: "大学が発行する公式学生証明書",
          version: "1.2.0",
          status: "active",
          schema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              studentId: {
                type: "string",
                title: "学籍番号",
                description: "大学が発行した一意の学籍番号",
                selectiveDisclosure: true,
                required: true,
              },
              fullName: {
                type: "string",
                title: "氏名",
                description: "学生の正式な氏名",
                selectiveDisclosure: true,
                required: true,
              },
              faculty: {
                type: "string",
                title: "学部",
                description: "所属学部",
                selectiveDisclosure: true,
                required: true,
              },
              department: {
                type: "string",
                title: "学科",
                description: "所属学科",
                selectiveDisclosure: true,
                required: true,
              },
              enrollmentYear: {
                type: "integer",
                title: "入学年度",
                description: "大学に入学した年度",
                selectiveDisclosure: true,
                required: true,
              },
              studentStatus: {
                type: "string",
                title: "在籍状況",
                description: "現在の在籍状況",
                enum: ["enrolled", "suspended", "graduated", "withdrawn"],
                default: "enrolled",
                selectiveDisclosure: true,
                required: true,
              },
            },
            required: ["studentId", "fullName", "faculty", "department", "enrollmentYear", "studentStatus"],
            additionalProperties: false,
          },
          display: {
            name: "大学学生証",
            description: "大学が発行する公式学生証明書",
            locale: "ja-JP",
            backgroundColor: "#1e40af",
            textColor: "#ffffff",
            logo: {
              url: "https://university.example.com/logo.png",
              altText: "大学ロゴ",
            },
          },
          issuanceConfig: {
            validityPeriod: 1095,
            issuer: "https://university.example.com",
            context: [
              "https://www.w3.org/2018/credentials/v1",
              "https://university.example.com/contexts/student-id/v1",
            ],
            type: ["VerifiableCredential", "UniversityStudentID"],
            revocable: true,
            batchIssuance: true,
          },
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-03-20T14:30:00Z",
        },
        {
          id: "academic-transcript-v2",
          name: "学業成績証明書",
          description: "学生の学業成績を証明する公式文書",
          version: "2.1.0",
          status: "active",
          schema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              studentId: {
                type: "string",
                title: "学籍番号",
                description: "大学が発行した一意の学籍番号",
                selectiveDisclosure: true,
                required: true,
              },
              fullName: {
                type: "string",
                title: "氏名",
                description: "学生の正式な氏名",
                selectiveDisclosure: true,
                required: true,
              },
              gpa: {
                type: "number",
                title: "GPA",
                description: "累積成績評価平均",
                selectiveDisclosure: true,
                required: true,
              },
              totalCredits: {
                type: "integer",
                title: "取得単位数",
                description: "取得した総単位数",
                selectiveDisclosure: true,
                required: true,
              },
              academicYear: {
                type: "string",
                title: "学年",
                description: "現在の学年",
                enum: ["1年生", "2年生", "3年生", "4年生", "大学院1年", "大学院2年"],
                selectiveDisclosure: true,
                required: true,
              },
              major: {
                type: "string",
                title: "専攻",
                description: "主専攻分野",
                selectiveDisclosure: true,
                required: true,
              },
            },
            required: ["studentId", "fullName", "gpa", "totalCredits", "academicYear", "major"],
            additionalProperties: false,
          },
          display: {
            name: "学業成績証明書",
            description: "学生の学業成績を証明する公式文書",
            locale: "ja-JP",
            backgroundColor: "#059669",
            textColor: "#ffffff",
          },
          issuanceConfig: {
            validityPeriod: 180,
            issuer: "https://university.example.com",
            context: ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context.json"],
            type: ["VerifiableCredential", "AcademicTranscript"],
            revocable: true,
            batchIssuance: false,
          },
          createdAt: "2024-02-01T09:00:00Z",
          updatedAt: "2024-03-25T16:45:00Z",
        },
      ]

      return NextResponse.json({
        success: true,
        credentialTypes: mockCredentialTypes,
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
      const response = await fetch(`${baseUrl}/api/credential-types`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(15000), // 15 seconds
      })

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
          { status: response.status },
        )
      }

      const data = await response.json()

      // Handle different response formats from VCM
      let credentialTypes = []
      if (Array.isArray(data)) {
        credentialTypes = data
      } else if (data.credentialTypes && Array.isArray(data.credentialTypes)) {
        credentialTypes = data.credentialTypes
      } else if (data.data && Array.isArray(data.data)) {
        credentialTypes = data.data
      } else if (data.items && Array.isArray(data.items)) {
        credentialTypes = data.items
      }

      return NextResponse.json({
        success: true,
        credentialTypes,
      })
    } catch (error) {
      console.error("Failed to fetch credential types:", error)
      return NextResponse.json(
        {
          success: false,
          message: `クレデンシャルタイプの取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("VCM credential types API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `APIエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      },
      { status: 500 },
    )
  }
}
