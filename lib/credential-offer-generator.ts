/**
 * OpenID4VCI 1.0準拠のCredential Offer生成ユーティリティ
 */

export interface CredentialOfferOptions {
  credentialIssuer: string
  credentialConfigurationIds: string[]
  preAuthCode?: string
  requirePin?: boolean
  pin?: string
  pinLength?: number
  pinDescription?: string
  pinInputMode?: "numeric" | "text"
}

export interface TxCodeConfig {
  input_mode: "numeric" | "text"
  length?: number
  description?: string
}

export function generateCredentialOffer(options: CredentialOfferOptions) {
  const {
    credentialIssuer,
    credentialConfigurationIds,
    preAuthCode = `pre_auth_${Math.random().toString(36).substring(2, 15)}`,
    requirePin = false,
    pinLength = 6,
    pinDescription = "ウォレットアプリでPINコードを入力してください",
    pinInputMode = "numeric",
  } = options

  // OpenID4VCI 1.0準拠のCredential Offer構造
  const offer: any = {
    credential_issuer: credentialIssuer,
    credential_configuration_ids: credentialConfigurationIds,
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": preAuthCode,
      },
    },
  }

  // OpenID4VCI 1.0仕様: PINが必要な場合のみtx_codeを追加
  if (requirePin) {
    const txCode: TxCodeConfig = {
      input_mode: pinInputMode,
      description: pinDescription,
    }

    // lengthは数値入力モードの場合のみ設定
    if (pinInputMode === "numeric" && pinLength) {
      txCode.length = pinLength
    }

    offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"].tx_code = txCode
  }

  return offer
}

export function generatePin(length = 6): string {
  return Math.random()
    .toString()
    .slice(2, 2 + length)
    .padStart(length, "0")
}

export function generateCredentialOfferUri(baseUrl: string, offerId: string): string {
  const offerUri = `${baseUrl}/api/credential-issuer/credential-offers/${offerId}`
  return `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(offerUri)}`
}

export function generateDirectCredentialOffer(baseUrl: string, offer: any): string {
  const encodedOffer = encodeURIComponent(JSON.stringify(offer))
  return `openid-credential-offer://?credential_offer=${encodedOffer}`
}

export function validateTxCode(txCode: TxCodeConfig): boolean {
  // OpenID4VCI 1.0仕様の検証
  if (!["numeric", "text"].includes(txCode.input_mode)) {
    return false
  }

  if (txCode.length !== undefined && (txCode.length < 1 || txCode.length > 128)) {
    return false
  }

  return true
}
