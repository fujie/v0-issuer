import type { CredentialTemplate } from "./credential-templates"
import { LocalStorageHelper } from "./local-storage-helper"

// 学生情報の型定義
export interface StudentInfo {
  studentId: string
  name: string
  email: string
  department: string
  year: number
  gpa?: number
  enrollmentDate?: string
  graduationDate?: string
}

// 証明書作成結果の型定義
export interface CredentialResult {
  credential: string
  format: string
  credentialId: string
}

/**
 * 証明書を作成する関数
 */
export async function createCredential(studentInfo: StudentInfo, templateId: string): Promise<CredentialResult> {
  try {
    console.log("証明書作成開始:", { studentInfo, templateId })

    // テンプレートを取得
    const templates = await getCredentialTemplates()
    const template = templates.find((t) => t.id === templateId)

    if (!template) {
      throw new Error(`テンプレートが見つかりません: ${templateId}`)
    }

    // 証明書データを構築
    const credentialData = {
      "@context": ["https://www.w3.org/2018/credentials/v1", "https://w3id.org/security/suites/jws-2020/v1"],
      type: ["VerifiableCredential", template.type],
      issuer: {
        id: process.env.NEXT_PUBLIC_ISSUER_DID || "did:web:example.com",
        name: "大学証明書発行機関",
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:example:${studentInfo.studentId}`,
        studentId: studentInfo.studentId,
        name: studentInfo.name,
        email: studentInfo.email,
        department: studentInfo.department,
        year: studentInfo.year,
        ...(studentInfo.gpa && { gpa: studentInfo.gpa }),
        ...(studentInfo.enrollmentDate && { enrollmentDate: studentInfo.enrollmentDate }),
        ...(studentInfo.graduationDate && { graduationDate: studentInfo.graduationDate }),
      },
    }

    // SD-JWT形式で証明書を生成（簡易版）
    const header = {
      alg: "ES256",
      typ: "vc+sd-jwt",
    }

    const payload = {
      ...credentialData,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1年後
      _sd_alg: "sha-256",
    }

    // 簡易的なJWT形式（実際の実装では適切な署名が必要）
    const encodedHeader = btoa(JSON.stringify(header))
    const encodedPayload = btoa(JSON.stringify(payload))
    const signature = "mock_signature_" + Date.now()

    const credential = `${encodedHeader}.${encodedPayload}.${signature}`
    const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log("証明書作成完了:", { credentialId, templateId })

    return {
      credential,
      format: "vc+sd-jwt",
      credentialId,
    }
  } catch (error) {
    console.error("証明書作成エラー:", error)
    throw new Error(`証明書の作成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * 利用可能な証明書テンプレートを取得する関数
 */
export async function getCredentialTemplates(): Promise<CredentialTemplate[]> {
  try {
    console.log("テンプレート取得開始")

    // 静的テンプレート
    const staticTemplates: CredentialTemplate[] = [
      {
        id: "UniversityStudentCredential",
        name: "学生証明書",
        description: "大学の学生であることを証明する証明書",
        type: "UniversityStudentCredential",
        version: "1.0",
        fields: [
          { name: "studentId", label: "学籍番号", type: "string", required: true },
          { name: "name", label: "氏名", type: "string", required: true },
          { name: "email", label: "メールアドレス", type: "string", required: true },
          { name: "department", label: "学部", type: "string", required: true },
          { name: "year", label: "学年", type: "number", required: true },
        ],
        selectiveDisclosure: {
          enabled: true,
          fields: ["email", "department", "year"],
        },
        issuancePolicy: {
          requiresApproval: false,
          validityPeriod: 365,
        },
      },
    ]

    // VCMテンプレートをローカルストレージから取得
    let vcmTemplates: CredentialTemplate[] = []
    try {
      const storage = new LocalStorageHelper()
      const storedTemplates = storage.getVCMTemplates()
      if (storedTemplates && storedTemplates.length > 0) {
        vcmTemplates = storedTemplates
        console.log("VCMテンプレート取得成功:", vcmTemplates.length, "件")
      } else {
        console.log("VCMテンプレートが見つかりません")
      }
    } catch (error) {
      console.warn("VCMテンプレート取得エラー:", error)
    }

    // 静的テンプレートとVCMテンプレートを統合
    const allTemplates = [...staticTemplates, ...vcmTemplates]

    console.log("テンプレート取得完了:", {
      静的テンプレート: staticTemplates.length,
      VCMテンプレート: vcmTemplates.length,
      合計: allTemplates.length,
    })

    return allTemplates
  } catch (error) {
    console.error("テンプレート取得エラー:", error)

    // エラー時は最低限の静的テンプレートを返す
    return [
      {
        id: "UniversityStudentCredential",
        name: "学生証明書（基本）",
        description: "基本的な学生証明書",
        type: "UniversityStudentCredential",
        version: "1.0",
        fields: [
          { name: "studentId", label: "学籍番号", type: "string", required: true },
          { name: "name", label: "氏名", type: "string", required: true },
        ],
        selectiveDisclosure: {
          enabled: false,
          fields: [],
        },
        issuancePolicy: {
          requiresApproval: false,
          validityPeriod: 365,
        },
      },
    ]
  }
}

// デフォルトエクスポート（互換性のため）
export default {
  createCredential,
  getCredentialTemplates,
}
