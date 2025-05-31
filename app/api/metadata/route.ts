import { NextResponse } from "next/server"

export async function GET() {
  try {
    const metadata = {
      issuer: "https://university-issuer.example.com",
      credential_endpoint: "/api/credential-issuer/credential",
      authorization_endpoint: "/api/credential-issuer/authorize",
      token_endpoint: "/api/credential-issuer/token",
      jwks_uri: "/api/credential-issuer/jwks",
      credential_configurations_supported: {
        StudentCredential: {
          format: "vc+sd-jwt",
          scope: "student_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [
            {
              name: "学生証明書",
              locale: "ja-JP",
              background_color: "#12107c",
              text_color: "#FFFFFF",
            },
          ],
          claims: {
            name: {
              display: [{ name: "氏名", locale: "ja-JP" }],
            },
            studentId: {
              display: [{ name: "学籍番号", locale: "ja-JP" }],
            },
          },
        },
      },
    }

    return NextResponse.json(metadata)
  } catch (error) {
    console.error("Metadata error:", error)
    return NextResponse.json({ error: "Failed to generate metadata" }, { status: 500 })
  }
}
