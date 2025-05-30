// Verifiable Credential Manager API Client
export interface VCMConfig {
  baseUrl: string
  apiKey: string
  organizationId: string
}

export interface VCMCredentialType {
  id: string
  name: string
  description: string
  version: string
  schema: VCMSchema
  display: VCMDisplayProperties
  issuanceConfig: VCMIssuanceConfig
  createdAt: string
  updatedAt: string
  status: "active" | "draft" | "deprecated"
}

export interface VCMSchema {
  $schema: string
  type: "object"
  properties: Record<string, VCMSchemaProperty>
  required: string[]
  additionalProperties: boolean
}

export interface VCMSchemaProperty {
  type: string
  title: string
  description: string
  format?: string
  enum?: string[]
  selectiveDisclosure?: boolean
  required?: boolean
  default?: any
}

export interface VCMDisplayProperties {
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

export interface VCMIssuanceConfig {
  validityPeriod: number
  issuer: string
  context: string[]
  type: string[]
  revocable: boolean
  batchIssuance: boolean
}

export interface VCMSyncResult {
  success: boolean
  synced: number
  errors: string[]
  lastSync: string
}

export class VCMClient {
  private config: VCMConfig

  constructor(config: VCMConfig) {
    this.config = config
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.ok
    } catch (error) {
      console.error("VCM connection test failed:", error)
      return false
    }
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/organizations/${this.config.organizationId}/credential-types`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.credentialTypes || []
    } catch (error) {
      console.error("Failed to fetch credential types:", error)
      throw error
    }
  }

  async getCredentialType(typeId: string): Promise<VCMCredentialType | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/organizations/${this.config.organizationId}/credential-types/${typeId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Failed to fetch credential type ${typeId}:`, error)
      throw error
    }
  }

  async syncCredentialTypes(): Promise<VCMSyncResult> {
    try {
      const credentialTypes = await this.getCredentialTypes()
      const syncResult: VCMSyncResult = {
        success: true,
        synced: 0,
        errors: [],
        lastSync: new Date().toISOString(),
      }

      // Convert VCM credential types to local templates
      for (const vcmType of credentialTypes) {
        try {
          const template = this.convertVCMTypeToTemplate(vcmType)
          await this.saveLocalTemplate(template)
          syncResult.synced++
        } catch (error) {
          syncResult.errors.push(`Failed to sync ${vcmType.name}: ${error.message}`)
        }
      }

      if (syncResult.errors.length > 0) {
        syncResult.success = false
      }

      return syncResult
    } catch (error) {
      return {
        success: false,
        synced: 0,
        errors: [error.message],
        lastSync: new Date().toISOString(),
      }
    }
  }

  private convertVCMTypeToTemplate(vcmType: VCMCredentialType): any {
    const claims = Object.entries(vcmType.schema.properties).map(([key, property]) => ({
      key,
      name: property.title,
      description: property.description,
      type: this.mapSchemaTypeToClaimType(property.type, property.format),
      required: vcmType.schema.required.includes(key),
      selectiveDisclosure: property.selectiveDisclosure || false,
      defaultValue: property.default,
      enum: property.enum,
    }))

    return {
      id: vcmType.id,
      name: vcmType.display.name,
      description: vcmType.display.description,
      type: vcmType.issuanceConfig.type,
      context: vcmType.issuanceConfig.context,
      claims,
      display: vcmType.display,
      validityPeriod: vcmType.issuanceConfig.validityPeriod,
      issuer: vcmType.issuanceConfig.issuer,
      version: vcmType.version,
      status: vcmType.status,
      vcmSource: true,
      lastSynced: new Date().toISOString(),
    }
  }

  private mapSchemaTypeToClaimType(schemaType: string, format?: string): string {
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

  private async saveLocalTemplate(template: any): Promise<void> {
    // Save to local storage or database
    // For demo purposes, we'll use localStorage
    const existingTemplates = this.getLocalTemplates()
    const updatedTemplates = existingTemplates.filter((t) => t.id !== template.id)
    updatedTemplates.push(template)

    if (typeof window !== "undefined") {
      localStorage.setItem("vcm_synced_templates", JSON.stringify(updatedTemplates))
    }
  }

  private getLocalTemplates(): any[] {
    if (typeof window === "undefined") {
      return []
    }

    try {
      const stored = localStorage.getItem("vcm_synced_templates")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  async getLocalSyncedTemplates(): Promise<any[]> {
    return this.getLocalTemplates()
  }

  async clearLocalTemplates(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vcm_synced_templates")
    }
  }
}

// Demo VCM API responses for testing
export const mockVCMCredentialTypes: VCMCredentialType[] = [
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
        photoUrl: {
          type: "string",
          title: "学生写真URL",
          description: "学生証用写真のURL",
          format: "uri",
          selectiveDisclosure: false,
          required: false,
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
      validityPeriod: 1095, // 3 years
      issuer: "https://university.example.com",
      context: ["https://www.w3.org/2018/credentials/v1", "https://university.example.com/contexts/student-id/v1"],
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
        graduationDate: {
          type: "string",
          title: "卒業予定日",
          description: "卒業予定日",
          format: "date",
          selectiveDisclosure: true,
          required: false,
        },
        honors: {
          type: "string",
          title: "優等学位",
          description: "優等学位の種類",
          enum: ["summa_cum_laude", "magna_cum_laude", "cum_laude", "none"],
          default: "none",
          selectiveDisclosure: true,
          required: false,
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
      logo: {
        url: "https://university.example.com/logo.png",
        altText: "大学ロゴ",
      },
    },
    issuanceConfig: {
      validityPeriod: 180, // 6 months
      issuer: "https://university.example.com",
      context: [
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        "https://university.example.com/contexts/transcript/v2",
      ],
      type: ["VerifiableCredential", "AcademicTranscript"],
      revocable: true,
      batchIssuance: false,
    },
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-03-25T16:45:00Z",
  },
]

// Mock VCM client for demo purposes
export class MockVCMClient extends VCMClient {
  async testConnection(): Promise<boolean> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return true
  }

  async getCredentialTypes(): Promise<VCMCredentialType[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return mockVCMCredentialTypes
  }

  async getCredentialType(typeId: string): Promise<VCMCredentialType | null> {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return mockVCMCredentialTypes.find((type) => type.id === typeId) || null
  }
}
