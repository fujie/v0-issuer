/**
 * OpenID4VCI 1.0準拠のCredential Offer生成ユーティリティ
 */

export interface CredentialOfferOptions {
  credentialIssuer: string
  credentialConfigurationIds: string[]
  preAuthCode?: string
  requirePin?: boolean
  pinLength?: number
  pinDescription?: string
}

export function generateCredentialOffer(options: CredentialOfferOptions) {
  const {
    credentialIssuer,
    credentialConfigurationIds,
    preAuthCode = `pre_auth_${Math.random().toString(36).substring(2, 15)}`,
    requirePin = false,
    pinLength = 6,
    pinDescription = "PINコードを入力してください",
  } = options

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
    offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"].tx_code = {
      input_mode: "numeric",
      length: pinLength,
      description: pinDescription,
    }
  }

  return offer
}

export function generateCredentialOfferUri(baseUrl: string, offerId: string): string {
  const offerUri = `${baseUrl}/api/credential-issuer/credential-offers/${offerId}`
  return `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(offerUri)}`
}
