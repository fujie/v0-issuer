import type { NextRequest } from "next/server"
import { ServerMetadataGenerator } from "@/lib/server-metadata-generator"

export async function GET(request: NextRequest) {
  try {
    console.log("OpenID Credential Issuer Metadata endpoint called")

    // リクエストのベースURLを取得
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
    console.log("Base URL:", baseUrl)

    // サーバーメタデータジェネレーターを使用してメタデータを生成
    const metadata = ServerMetadataGenerator.generateIssuerMetadata(baseUrl)

    console.log("Generated metadata with configurations:", Object.keys(metadata.credential_configurations_supported))

    return new Response(JSON.stringify(metadata, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=300", // 5分間キャッシュ
      },
    })
  } catch (error) {
    console.error("Error generating OpenID Credential Issuer metadata:", error)

    // エラーの場合は最小限のメタデータを返す
    const fallbackMetadata = {
      credential_issuer: "https://university-issuer.example.com",
      authorization_server: "https://university-issuer.example.com",
      credential_endpoint: "/api/credential-issuer/credential",
      token_endpoint: "/api/credential-issuer/token",
      jwks_uri: "/api/credential-issuer/.well-known/jwks.json",
      credential_configurations_supported: {
        UniversityStudentCredential: {
          format: "vc+sd-jwt",
          scope: "student_credential",
          cryptographic_binding_methods_supported: ["did"],
          credential_signing_alg_values_supported: ["ES256"],
          display: [{ name: "学生証明書", locale: "ja-JP" }],
          claims: {
            name: { display: [{ name: "氏名", locale: "ja-JP" }] },
            studentId: { display: [{ name: "学籍番号", locale: "ja-JP" }] },
          },
        },
      },
    }

    return new Response(JSON.stringify(fallbackMetadata, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
