import { type NextRequest, NextResponse } from "next/server"
import { UpdatedVCMClient } from "@/lib/vcm-client-updated"
import { VCMConfigManager } from "@/lib/vcm-config-updated"

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-vcm-signature")
    const payload = await request.text()

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Get VCM configuration
    const config = VCMConfigManager.getConfig()
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "VCM integration not configured" }, { status: 400 })
    }

    // Create VCM client and validate webhook
    const client = new UpdatedVCMClient(config)
    const webhookSecret = VCMConfigManager.getWebhookSecret()

    const isValid = await client.validateWebhook(payload, signature, webhookSecret)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse webhook event
    const event = JSON.parse(payload)

    // Handle the webhook event
    await client.handleWebhookEvent(event)

    // Log the event
    console.log("VCM webhook event processed:", {
      type: event.type,
      id: event.id,
      timestamp: event.timestamp,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("VCM webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "VCM Webhook endpoint",
    webhookUrl: `${process.env.VERCEL_URL || "http://localhost:3000"}/api/webhooks/vcm`,
  })
}
