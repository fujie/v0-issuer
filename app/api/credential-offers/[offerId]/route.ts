import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { offerId: string } }) {
  try {
    const { offerId } = params

    console.log(`Retrieving credential offer: ${offerId}`)

    // 実際の実装ではデータベースからOfferデータを取得
    // ここではlocalStorageから取得する簡易実装
    let offerData: any = null

    if (typeof window !== "undefined") {
      const storedOffer = localStorage.getItem(`credential_offer_${offerId}`)
      if (storedOffer) {
        const parsedOffer = JSON.parse(storedOffer)
        offerData = parsedOffer.offerData
      }
    }

    // サーバーサイドでは固定のデモデータを返す
    if (!offerData) {
      console.log("Using demo offer data")
      const url = new URL(request.url)
      const baseUrl = `${url.protocol}//${url.host}`

      offerData = {
        credential_issuer: `${baseUrl}/api/credential-issuer`,
        credential_configuration_ids: ["StudentCredential"],
        grants: {
          authorization_code: {
            issuer_state: offerId,
          },
        },
      }
    }

    console.log("Returning offer data:", offerData)

    return NextResponse.json(offerData, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("Error retrieving credential offer:", error)
    return NextResponse.json({ error: "Failed to retrieve credential offer" }, { status: 500 })
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
