import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // OpenID4VCI Credential Issuer Metadata
  const metadata = {
    issuer: "https://university-issuer.example.com",
    credential_endpoint: `${request.headers.get("host")}/api/credential-issuer/credential`,
    authorization_endpoint: `${request.headers.get("host")}/api/credential-issuer/authorize`,
    token_endpoint: `${request.headers.get("host")}/api/credential-issuer/token`,
    jwks_uri: `${request.headers.get("host")}/api/credential-issuer/.well-known/jwks.json`,
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
            logo: {
              url: "https://university-issuer.example.com/logo.png",
              alt_text: "大学ロゴ",
            },
            background_color: "#12107c",
            text_color: "#FFFFFF",
          },
        ],
        claims: {
          name: {
            display: [
              {
                name: "氏名",
                locale: "ja-JP",
              },
            ],
          },
          studentId: {
            display: [
              {
                name: "学籍番号",
                locale: "ja-JP",
              },
            ],
          },
          department: {
            display: [
              {
                name: "所属",
                locale: "ja-JP",
              },
            ],
          },
          status: {
            display: [
              {
                name: "在籍状況",
                locale: "ja-JP",
              },
            ],
          },
        },
      },
    },
  }

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
