import { NextResponse } from "next/server"

export async function GET() {
  // Demo JWKS for credential signing
  // In a production environment, this would be your actual JWK Set
  const jwks = {
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        kid: "university-issuer-key-2023",
        x: "7xbG-J0AQtpPArBOYNv1x9_JPvgBWGI40rZnwjNzTuc",
        y: "pBRgr0oi_I-C_zszVCT3XcCYTq8jar8XYRiUoEhUQ4Y",
        use: "sig",
        alg: "ES256",
      },
    ],
  }

  return NextResponse.json(jwks)
}
