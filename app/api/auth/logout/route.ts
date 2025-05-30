import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function POST() {
  // セッションCookieを削除
  cookies().delete("session")

  return redirect("/")
}
