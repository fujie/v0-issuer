// In-memory storage for demo purposes
// In production, use a proper database like Redis or PostgreSQL

interface CredentialOffer {
  credential_issuer: string
  credential_configuration_ids: string[]
  grants: any
}

interface PreAuthCode {
  userId: string
  userPinRequired: boolean
  expiresAt: number
  userPin?: string
}

interface AuthRequest {
  clientId: string
  redirectUri: string
  scope: string
  state?: string
  issuerState?: string
  codeChallenge?: string
  codeChallengeMethod?: string
  userId: string
  timestamp: number
}

interface TokenData {
  userId: string
  scope: string
  clientId: string
  issuerState?: string
  expiresAt: number
  cNonce: string
  cNonceExpiresAt: number
}

// Global storage objects
declare global {
  var credentialOffers: Record<string, CredentialOffer> | undefined
  var preAuthCodes: Record<string, PreAuthCode> | undefined
  var authRequests: Record<string, AuthRequest> | undefined
  var tokens: Record<string, TokenData> | undefined
}

// Initialize storage if not exists
if (!global.credentialOffers) {
  global.credentialOffers = {}
}

if (!global.preAuthCodes) {
  global.preAuthCodes = {}
}

if (!global.authRequests) {
  global.authRequests = {}
}

if (!global.tokens) {
  global.tokens = {}
}

export const storage = {
  credentialOffers: global.credentialOffers,
  preAuthCodes: global.preAuthCodes,
  authRequests: global.authRequests,
  tokens: global.tokens,
}

// Helper functions
export function storeCredentialOffer(offerId: string, offer: CredentialOffer) {
  storage.credentialOffers[offerId] = offer
}

export function getCredentialOffer(offerId: string): CredentialOffer | undefined {
  return storage.credentialOffers[offerId]
}

export function storePreAuthCode(code: string, data: PreAuthCode) {
  storage.preAuthCodes[code] = data
}

export function getPreAuthCode(code: string): PreAuthCode | undefined {
  return storage.preAuthCodes[code]
}

export function removePreAuthCode(code: string) {
  delete storage.preAuthCodes[code]
}

export function storeAuthRequest(code: string, data: AuthRequest) {
  storage.authRequests[code] = data
}

export function getAuthRequest(code: string): AuthRequest | undefined {
  return storage.authRequests[code]
}

export function removeAuthRequest(code: string) {
  delete storage.authRequests[code]
}

export function storeToken(token: string, data: TokenData) {
  storage.tokens[token] = data
}

export function getToken(token: string): TokenData | undefined {
  return storage.tokens[token]
}

export function removeToken(token: string) {
  delete storage.tokens[token]
}

// Cleanup expired items
export function cleanupExpiredItems() {
  const now = Date.now()

  // Cleanup expired pre-auth codes
  Object.keys(storage.preAuthCodes).forEach((code) => {
    const data = storage.preAuthCodes[code]
    if (data && data.expiresAt < now) {
      delete storage.preAuthCodes[code]
    }
  })

  // Cleanup expired auth requests (10 minutes)
  Object.keys(storage.authRequests).forEach((code) => {
    const data = storage.authRequests[code]
    if (data && data.timestamp < now - 600000) {
      delete storage.authRequests[code]
    }
  })

  // Cleanup expired tokens
  Object.keys(storage.tokens).forEach((token) => {
    const data = storage.tokens[token]
    if (data && data.expiresAt < now) {
      delete storage.tokens[token]
    }
  })
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredItems, 5 * 60 * 1000)
}
