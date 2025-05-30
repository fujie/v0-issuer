import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSession } from "@/lib/auth"
import { verifySAMLResponse } from "@/lib/saml"

export async function POST(request: Request) {
  const formData = await request.formData()
  const samlResponse = formData.get("SAMLResponse") as string

  if (!samlResponse) {
    return new Response("SAML Response is missing", { status: 400 })
  }

  try {
    // SAMLレスポンスを検証
    const userData = await verifySAMLResponse(samlResponse)

    // セッションを作成
    const session = await createSession({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      studentId: userData.studentId,
      department: userData.department,
    })

    // セッションCookieを設定
    cookies().set({
      name: "session",
      value: session,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1時間
    })

    return redirect("/dashboard")
  } catch (error) {
    console.error("Authentication error:", error)
    return new Response("Authentication failed", { status: 401 })
  }
}
