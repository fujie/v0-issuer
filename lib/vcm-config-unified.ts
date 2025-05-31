// 統一されたVCM設定管理クラス
export interface VCMConnectionConfig {
  baseUrl: string
  apiKey: string
  organizationId?: string
  enabled: boolean
  autoSync: boolean
  syncInterval: number
  useMockData: boolean
  lastSync?: string
}

export interface VCMSyncSettings {
  includeDeprecated: boolean
  overwriteLocal: boolean
  syncOnStartup: boolean
  notifyOnSync: boolean
  batchSize: number
  retryAttempts: number
}

export class VCMConfigManager {
  // 統一されたキー名
  private static readonly CONFIG_KEY = "vcm_connection_config"
  private static readonly SYNC_SETTINGS_KEY = "vcm_sync_settings"

  private static isClient(): boolean {
    return typeof window !== "undefined"
  }

  static getConfig(): VCMConnectionConfig | null {
    if (!this.isClient()) {
      console.log("VCMConfigManager.getConfig: Not on client side")
      return null
    }

    try {
      const stored = localStorage.getItem(this.CONFIG_KEY)
      console.log("VCMConfigManager.getConfig: Raw stored data:", stored)

      if (!stored) {
        console.log("VCMConfigManager.getConfig: No config found")
        return null
      }

      const config = JSON.parse(stored)
      console.log("VCMConfigManager.getConfig: Parsed config:", {
        ...config,
        apiKey: config.apiKey ? "[REDACTED]" : null,
      })
      return config
    } catch (error) {
      console.error("VCMConfigManager.getConfig: Error reading config:", error)
      return null
    }
  }

  static saveConfig(config: VCMConnectionConfig): void {
    if (!this.isClient()) {
      console.log("VCMConfigManager.saveConfig: Not on client side")
      return
    }

    try {
      console.log("VCMConfigManager.saveConfig: Saving config:", {
        ...config,
        apiKey: config.apiKey ? "[REDACTED]" : null,
      })
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config))
      console.log("VCMConfigManager.saveConfig: Config saved successfully")

      // 保存後に確認
      const verification = localStorage.getItem(this.CONFIG_KEY)
      console.log("VCMConfigManager.saveConfig: Verification read:", verification ? "SUCCESS" : "FAILED")
    } catch (error) {
      console.error("VCMConfigManager.saveConfig: Error saving config:", error)
    }
  }

  static getSyncSettings(): VCMSyncSettings {
    if (!this.isClient()) {
      return this.getDefaultSyncSettings()
    }

    try {
      const stored = localStorage.getItem(this.SYNC_SETTINGS_KEY)
      if (!stored) {
        return this.getDefaultSyncSettings()
      }

      const settings = JSON.parse(stored)
      return {
        ...this.getDefaultSyncSettings(),
        ...settings,
      }
    } catch (error) {
      console.error("VCMConfigManager.getSyncSettings: Error reading sync settings:", error)
      return this.getDefaultSyncSettings()
    }
  }

  static saveSyncSettings(settings: VCMSyncSettings): void {
    if (!this.isClient()) {
      return
    }

    try {
      localStorage.setItem(this.SYNC_SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error("VCMConfigManager.saveSyncSettings: Error saving sync settings:", error)
    }
  }

  static updateLastSync(): void {
    const config = this.getConfig()
    if (config) {
      config.lastSync = new Date().toISOString()
      this.saveConfig(config)
    }
  }

  static clearConfig(): void {
    if (!this.isClient()) {
      return
    }

    try {
      localStorage.removeItem(this.CONFIG_KEY)
      localStorage.removeItem(this.SYNC_SETTINGS_KEY)
      console.log("VCMConfigManager.clearConfig: Config cleared")
    } catch (error) {
      console.error("VCMConfigManager.clearConfig: Error clearing config:", error)
    }
  }

  static isConfigured(): boolean {
    const config = this.getConfig()
    const result = !!(config && config.enabled && (config.useMockData || (config.baseUrl && config.apiKey)))

    console.log("VCMConfigManager.isConfigured:", result)
    console.log("VCMConfigManager.isConfigured details:", {
      configExists: !!config,
      enabled: config?.enabled,
      useMockData: config?.useMockData,
      hasBaseUrl: !!config?.baseUrl,
      hasApiKey: !!config?.apiKey,
    })

    return result
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

  static getStatus(): {
    configured: boolean
    enabled: boolean
    lastSync: string | null
    hasCredentials: boolean
  } {
    const config = this.getConfig()

    return {
      configured: this.isConfigured(),
      enabled: config?.enabled || false,
      lastSync: config?.lastSync || null,
      hasCredentials: !!config?.apiKey,
    }
  }

  // デバッグ用メソッド
  static debugInfo(): any {
    const config = this.getConfig()
    return {
      isClient: this.isClient(),
      configKey: this.CONFIG_KEY,
      configExists: !!config,
      configEnabled: config?.enabled,
      configUseMockData: config?.useMockData,
      configHasBaseUrl: !!config?.baseUrl,
      configHasApiKey: !!config?.apiKey,
      isConfigured: this.isConfigured(),
      rawConfig: config,
      localStorageKeys: this.isClient() ? Object.keys(localStorage) : [],
    }
  }
}
