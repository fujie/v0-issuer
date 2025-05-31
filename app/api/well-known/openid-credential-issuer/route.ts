import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  const metadata = {
    issuer: baseUrl,
    credential_endpoint: `${baseUrl}/api/credential-issuer/credential`,
    authorization_endpoint: `${baseUrl}/api/credential-issuer/authorize`,
    token_endpoint: `${baseUrl}/api/credential-issuer/token`,
    credential_supported: ["VerifiableCredential"],
    credential_formats_supported: ["jwt_vc_json"],
    scopes_supported: ["openid", "profile", "email", "address", "phone", "offline_access"],
    response_types_supported: [
      "code",
      "token",
      "id_token",
      "code token",
      "code id_token",
      "id_token token",
      "code id_token token",
    ],
    grant_types_supported: [
      "authorization_code",
      "implicit",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    ],
    subject_types_supported: ["public", "pairwise"],
    id_token_signing_alg_values_supported: ["RS256"],
    request_object_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "private_key_jwt"],
    token_endpoint_auth_signing_alg_values_supported: ["RS256"],
    service_documentation: "https://example.com/documentation",
    ui_locales_supported: ["en-US", "ja-JP"],
    op_policy_uri: "https://example.com/policy",
    op_tos_uri: "https://example.com/tos",
  }

  return NextResponse.json(metadata)
}
