import { NextResponse } from "next/server"
import { credentialOffers } from "../route"

export async function GET(request: Request, { params }: { params: { offerId: string } }) {
  const { offerId } = params

  // 保存されたCredential Offerを取得
  const offer = credentialOffers[offerId]

  if (!offer) {
    return NextResponse.json({ error: "not_found", error_description: "Credential offer not found" }, { status: 404 })
  }

  return NextResponse.json(offer, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
