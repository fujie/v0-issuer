import { NextResponse } from "next/server"

// Import the storage from the parent route
let credentialOffers: Record<string, any> = {}

// Try to import from the parent route, fallback to empty object
try {
  const parentModule = require("../route")
  credentialOffers = parentModule.credentialOffers || {}
} catch (error) {
  console.warn("Could not import credential offers from parent route, using empty storage")
}

export async function GET(request: Request, { params }: { params: { offerId: string } }) {
  try {
    const { offerId } = params

    if (!offerId) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing offer ID" }, { status: 400 })
    }

    // Retrieve the credential offer from storage
    const credentialOffer = credentialOffers[offerId]

    if (!credentialOffer) {
      return NextResponse.json(
        { error: "invalid_credential_offer", error_description: "Credential offer not found" },
        { status: 404 },
      )
    }

    return NextResponse.json(credentialOffer, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("Credential offer endpoint error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
  }
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
