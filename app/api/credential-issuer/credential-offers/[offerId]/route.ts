import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { offerId: string } }) {
  const { offerId } = params

  // In a real implementation, retrieve the credential offer from a database
  // For demo purposes, we'll generate a credential offer based on the offer ID

  const credentialOffer = {
    credential_issuer: "https://university-issuer.example.com",
    credential_configuration_ids: ["StudentCredential"],
    grants: {
      authorization_code: {
        issuer_state: `state_${Math.random().toString(36).substring(2, 10)}`,
      },
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": `pre_auth_${Math.random().toString(36).substring(2, 15)}`,
        user_pin_required: false,
      },
    },
  }

  return NextResponse.json(credentialOffer, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
