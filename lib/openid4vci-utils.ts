/**
 * Utility functions for OpenID4VCI.
 * Compliant with OpenID4VCI 1.0 specifications.
 */

/**
 * Generates a Credential Offer.
 * Compliant with OpenID4VCI 1.0 specifications.
 *
 * @param {string} credentialIssuer - The URL of the credential issuer.
 * @param {string} credentialTypes - An array of credential types being offered.
 * @param {string} preAuthCode - The pre-authorized code.
 * @returns {object} The Credential Offer object.
 */
export function generateCredentialOffer(
  credentialIssuer: string,
  credentialTypes: string[],
  preAuthCode: string,
): object {
  return {
    credential_issuer: credentialIssuer,
    credential_types: credentialTypes,
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": preAuthCode,
        // OpenID4VCI 1.0仕様: tx_codeを省略でPINコード不要
      },
    },
  }
}

// OpenID4VCI 1.0仕様に準拠したCredential Offer生成
export function generateStandardCredentialOffer(
  credentialIssuer: string,
  credentialConfigurationIds: string[],
  preAuthCode?: string,
) {
  return {
    credential_issuer: credentialIssuer,
    credential_configuration_ids: credentialConfigurationIds,
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": preAuthCode || `pre_auth_${Math.random().toString(36).substring(2, 15)}`,
        // tx_codeを省略 = PINコード不要
      },
    },
  }
}
