import { cookies } from "next/headers"

// 本番環境では安全な秘密鍵を使用してください
const JWT_SECRET = "your-secret-key"

export interface User {
  id: string
  name: string
  email: string
  studentId: string
  department: string
}

export interface Session {
  user: User
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("session")

  if (!sessionCookie?.value) {
    return null
  }

  try {
    // Simple JWT verification for demo purposes
    // In production, use a proper JWT library
    const payload = JSON.parse(Buffer.from(sessionCookie.value.split(".")[1], "base64").toString())
    return payload as Session
  } catch (error) {
    console.error("Session verification error:", error)
    return null
  }
}

export async function createSession(user: User): Promise<string> {
  // Simple JWT creation for demo purposes
  // In production, use a proper JWT library
  const header = { alg: "HS256", typ: "JWT" }
  const payload = { user, exp: Math.floor(Date.now() / 1000) + 3600 }

  const base64Header = Buffer.from(JSON.stringify(header))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  const base64Payload = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  // In a real application, you would sign this properly
  const signature = "demo_signature_for_preview"

  return `${base64Header}.${base64Payload}.${signature}`
}
