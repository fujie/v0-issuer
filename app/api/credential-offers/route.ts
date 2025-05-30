import { NextResponse } from "next/server"

// In-memory storage for demo purposes
// In production, use a proper database
const credentialOffers: Record<string, any> = {}
const preAuthCodes: Record<string, any> = {}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { offerId, offer, preAuthCode, userId } = data

    if (!offerId || !offer || !preAuthCode) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 },
      )
    }

    // Store the credential offer
    credentialOffers[offerId] = offer

    // Store the pre-auth code
    preAuthCodes[preAuthCode] = {
      userId,
      userPinRequired: false,
      expiresAt: Date.now() + 600000, // 10 minutes
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Store credential offer error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "An error occurred processing the request" },
      { status: 500 },
    )
  }
}

// Export the storage for other routes to access
export { credentialOffers, preAuthCodes }
