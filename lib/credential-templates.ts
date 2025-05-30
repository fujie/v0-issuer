// Verifiable Credential Managerで定義されたクレデンシャルテンプレート
export interface CredentialTemplate {
  id: string
  name: string
  description: string
  type: string[]
  context: string[]
  claims: CredentialClaim[]
  display: {
    name: string
    locale: string
    backgroundColor?: string
    textColor?: string
    logo?: {
      url: string
      altText: string
    }
  }
  validityPeriod: number // days
  issuer: string
}

export interface CredentialClaim {
  key: string
  name: string
  description: string
  type: "string" | "number" | "boolean" | "date"
  required: boolean
  selectiveDisclosure: boolean
  defaultValue?: any
}

// 利用可能なクレデンシャルテンプレート
export const credentialTemplates: CredentialTemplate[] = [
  {
    id: "student-credential",
    name: "学生証明書",
    description: "大学の在籍を証明する基本的な学生証明書",
    type: ["VerifiableCredential", "StudentCredential"],
    context: ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
    claims: [
      {
        key: "name",
        name: "氏名",
        description: "学生の氏名",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "studentId",
        name: "学籍番号",
        description: "大学が発行した学籍番号",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "department",
        name: "所属学部・学科",
        description: "学生が所属する学部・学科",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "status",
        name: "在籍状況",
        description: "現在の在籍状況",
        type: "string",
        required: true,
        selectiveDisclosure: true,
        defaultValue: "enrolled",
      },
      {
        key: "enrollmentDate",
        name: "入学年月日",
        description: "大学への入学年月日",
        type: "date",
        required: false,
        selectiveDisclosure: true,
      },
      {
        key: "expectedGraduation",
        name: "卒業予定年月",
        description: "卒業予定年月",
        type: "date",
        required: false,
        selectiveDisclosure: true,
      },
    ],
    display: {
      name: "学生証明書",
      locale: "ja-JP",
      backgroundColor: "#1e40af",
      textColor: "#ffffff",
      logo: {
        url: "https://university-issuer.example.com/logo.png",
        altText: "大学ロゴ",
      },
    },
    validityPeriod: 365,
    issuer: "https://university-issuer.example.com",
  },
  {
    id: "academic-transcript",
    name: "成績証明書",
    description: "学生の学業成績を証明する証明書",
    type: ["VerifiableCredential", "AcademicTranscript"],
    context: [
      "https://www.w3.org/2018/credentials/v1",
      "https://schema.org/",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    claims: [
      {
        key: "name",
        name: "氏名",
        description: "学生の氏名",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "studentId",
        name: "学籍番号",
        description: "大学が発行した学籍番号",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "gpa",
        name: "GPA",
        description: "累積成績評価平均",
        type: "number",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "totalCredits",
        name: "取得単位数",
        description: "取得した総単位数",
        type: "number",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "academicYear",
        name: "学年",
        description: "現在の学年",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "major",
        name: "専攻",
        description: "主専攻分野",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
    ],
    display: {
      name: "成績証明書",
      locale: "ja-JP",
      backgroundColor: "#059669",
      textColor: "#ffffff",
      logo: {
        url: "https://university-issuer.example.com/logo.png",
        altText: "大学ロゴ",
      },
    },
    validityPeriod: 90,
    issuer: "https://university-issuer.example.com",
  },
  {
    id: "graduation-certificate",
    name: "卒業証明書",
    description: "大学の卒業を証明する証明書",
    type: ["VerifiableCredential", "GraduationCertificate"],
    context: ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context.json"],
    claims: [
      {
        key: "name",
        name: "氏名",
        description: "卒業生の氏名",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "studentId",
        name: "学籍番号",
        description: "大学が発行した学籍番号",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "degree",
        name: "学位",
        description: "取得した学位",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "major",
        name: "専攻",
        description: "主専攻分野",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "graduationDate",
        name: "卒業年月日",
        description: "卒業した年月日",
        type: "date",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "honors",
        name: "優等学位",
        description: "優等学位の有無",
        type: "string",
        required: false,
        selectiveDisclosure: true,
      },
    ],
    display: {
      name: "卒業証明書",
      locale: "ja-JP",
      backgroundColor: "#7c2d12",
      textColor: "#ffffff",
      logo: {
        url: "https://university-issuer.example.com/logo.png",
        altText: "大学ロゴ",
      },
    },
    validityPeriod: 3650, // 10 years
    issuer: "https://university-issuer.example.com",
  },
  {
    id: "enrollment-certificate",
    name: "在学証明書",
    description: "現在の在学状況を証明する証明書",
    type: ["VerifiableCredential", "EnrollmentCertificate"],
    context: ["https://www.w3.org/2018/credentials/v1"],
    claims: [
      {
        key: "name",
        name: "氏名",
        description: "学生の氏名",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "studentId",
        name: "学籍番号",
        description: "大学が発行した学籍番号",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "currentYear",
        name: "現在の学年",
        description: "現在在籍している学年",
        type: "string",
        required: true,
        selectiveDisclosure: true,
      },
      {
        key: "enrollmentStatus",
        name: "在籍区分",
        description: "在籍区分（正規生、科目等履修生等）",
        type: "string",
        required: true,
        selectiveDisclosure: true,
        defaultValue: "正規生",
      },
      {
        key: "expectedGraduation",
        name: "卒業予定年月",
        description: "卒業予定年月",
        type: "date",
        required: true,
        selectiveDisclosure: true,
      },
    ],
    display: {
      name: "在学証明書",
      locale: "ja-JP",
      backgroundColor: "#7c3aed",
      textColor: "#ffffff",
      logo: {
        url: "https://university-issuer.example.com/logo.png",
        altText: "大学ロゴ",
      },
    },
    validityPeriod: 30,
    issuer: "https://university-issuer.example.com",
  },
]

export function getCredentialTemplate(templateId: string): CredentialTemplate | undefined {
  return credentialTemplates.find((template) => template.id === templateId)
}

export function getAvailableTemplates(): CredentialTemplate[] {
  return credentialTemplates
}
