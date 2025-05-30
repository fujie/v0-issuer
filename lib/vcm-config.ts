// VCM Configuration Management with SSR safety
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
  private static isClient(): boolean {
    return typeof window !== "undefined"
  }

  static getConfig(): VCMConnectionConfig | null {
    if (!this.isClient()) {
      return null
    }

    try {
      const stored = localStorage.getItem(VCM_CONFIG_KEY)
      if (stored) {
        const config = JSON.parse(stored)
        // Ensure default values for new fields
        return {
          webhookSecret: "whisec_lf1jah5h",
          ...config,
        }
      }
      return null
    } catch {
      return null
    }
  }

  static saveConfig(config: VCMConnectionConfig): void {
    if (this.isClient()) {
      try {
        localStorage.setItem(VCM_CONFIG_KEY, JSON.stringify(config))
      } catch (error) {
        console.error("Failed to save VCM config:", error)
      }
    }
  }

  static getSyncSettings(): VCMSyncSettings {
    if (!this.isClient()) {
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
    if (this.isClient()) {
      try {
        localStorage.setItem(VCM_SYNC_SETTINGS_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error("Failed to save VCM sync settings:", error)
      }
    }
  }

  static clearConfig(): void {
    if (this.isClient()) {
      try {
        localStorage.removeItem(VCM_CONFIG_KEY)
        localStorage.removeItem(VCM_SYNC_SETTINGS_KEY)
      } catch (error) {
        console.error("Failed to clear VCM config:", error)
      }
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
    if (!this.isClient()) {
      return false
    }

    const config = this.getConfig()
    return !!(config && config.baseUrl && config.apiKey)
  }

  static updateLastSync(): void {
    if (!this.isClient()) {
      return
    }

    const config = this.getConfig()
    if (config) {
      config.lastSync = new Date().toISOString()
      this.saveConfig(config)
    }
  }

  static updateIntegrationId(integrationId: string): void {
    if (!this.isClient()) {
      return
    }

    const config = this.getConfig()
    if (config) {
      config.integrationId = integrationId
      this.saveConfig(config)
    }
  }

  static getWebhookSecret(): string {
    if (!this.isClient()) {
      return "whisec_lf1jah5h"
    }

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
}
