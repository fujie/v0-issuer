// VCM Configuration Management
export interface VCMConnectionConfig {
  baseUrl: string
  apiKey: string
  organizationId: string
  enabled: boolean
  autoSync: boolean
  syncInterval: number // minutes
  lastSync?: string
}

export interface VCMSyncSettings {
  includeDeprecated: boolean
  overwriteLocal: boolean
  syncOnStartup: boolean
  notifyOnSync: boolean
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
      return stored ? JSON.parse(stored) : null
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
      return stored ? JSON.parse(stored) : this.getDefaultSyncSettings()
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
    }
  }

  static isConfigured(): boolean {
    const config = this.getConfig()
    return !!(config && config.baseUrl && config.apiKey && config.organizationId)
  }

  static updateLastSync(): void {
    const config = this.getConfig()
    if (config) {
      config.lastSync = new Date().toISOString()
      this.saveConfig(config)
    }
  }
}
