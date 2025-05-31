// シンプルなローカルストレージヘルパー - クライアントサイドでのみ実行
export const LocalStorageHelper = {
  getItem: (key: string, defaultValue: any = null): any => {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e)
      return defaultValue
    }
  },

  setItem: (key: string, value: any): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e)
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error(`Error removing ${key} from localStorage:`, e)
    }
  },
}
