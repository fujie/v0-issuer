// VCM Configuration Management
export interface VCMConnectionConfig {
  baseUrl: string
  apiKey: string
  organizationId?: string
  enabled: boolean
  autoSync: boolean
  syncInterval: number // minutes
  lastSync?: string
  webhookSecret?: string
  integrationId?: string
  useMockData?: boolean // デモモードの状態を保存
}

export interface VCMSyncSettings {
  includeDeprecated: boolean
  overwriteLocal: boolean
  syncOnStartup: boolean
  notifyOnSync: boolean
  batchSize: number
  retryAttempts: number
}

const VCM_CONFIG_KEY = "vcm_connection_config"
const VCM_SYNC_SETTINGS_KEY = "vcm_sync_settings"

export class VCMConfigManager {
  static getConfig(): VCMConnectionConfig | null {
    if (typeof window === "undefined") {
      return null
    }

    try {
      const stored = localStorage.getItem(VCM_CONFIG_KEY)
      if (stored) {
        const config = JSON.parse(stored)
        // Ensure default values for new fields
        return {
          webhookSecret: "whisec_lf1jah5h",
          useMockData: true, // デフォルトでデモモード
          ...config,
        }
      }
      return null
    } catch {
      return null
    }
  }

  static saveConfig(config: VCMConnectionConfig): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(VCM_CONFIG_KEY, JSON.stringify(config))
    }
  }

  static getSyncSettings(): VCMSyncSettings {
    if (typeof window === "undefined") {
      return this.getDefaultSyncSettings()
    }

    try {
      const stored = localStorage.getItem(VCM_SYNC_SETTINGS_KEY)
      if (stored) {
        const settings = JSON.parse(stored)
        // Ensure default values for new fields
        return {
          ...this.getDefaultSyncSettings(),
          ...settings,
        }
      }
      return this.getDefaultSyncSettings()
    } catch {
      return this.getDefaultSyncSettings()
    }
  }

  static saveSyncSettings(settings: VCMSyncSettings): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(VCM_SYNC_SETTINGS_KEY, JSON.stringify(settings))
    }
  }

  static clearConfig(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(VCM_CONFIG_KEY)
      localStorage.removeItem(VCM_SYNC_SETTINGS_KEY)
    }
  }

  private static getDefaultSyncSettings(): VCMSyncSettings {
    return {
      includeDeprecated: false,
      overwriteLocal: true,
      syncOnStartup: false,
      notifyOnSync: true,
      batchSize: 10,
      retryAttempts: 3,
    }
  }

  static isConfigured(): boolean {
    const config = this.getConfig()
    return !!(config && config.baseUrl && config.apiKey && config.enabled)
  }

  static updateLastSync(): void {
    const config = this.getConfig()
    if (config) {
      config.lastSync = new Date().toISOString()
      this.saveConfig(config)
    }
  }

  static updateIntegrationId(integrationId: string): void {
    const config = this.getConfig()
    if (config) {
      config.integrationId = integrationId
      this.saveConfig(config)
    }
  }

  static getWebhookSecret(): string {
    const config = this.getConfig()
    return config?.webhookSecret || "whisec_lf1jah5h"
  }

  static generateWebhookSecret(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let result = "whisec_"
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  static getUseMockData(): boolean {
    const config = this.getConfig()
    return config?.useMockData ?? true // デフォルトでデモモード
  }

  static setUseMockData(useMockData: boolean): void {
    const config = this.getConfig()
    if (config) {
      config.useMockData = useMockData
      this.saveConfig(config)
    }
  }
}
