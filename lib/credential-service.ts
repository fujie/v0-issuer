export async function issueCredential(userId: string): Promise<string> {
  // ユーザー情報を取得（実際のアプリケーションではデータベースから取得）
  const userInfo = await fetchUserInfo(userId)

  // JWTヘッダー
  const header = {
    alg: "ES256",
    typ: "vc+sd-jwt",
    kid: "university-issuer-key-2023",
  }

  // 簡易的なソルト生成（デモ用）
  function generateSimpleSalt() {
    return Math.random().toString(36).substring(2, 15)
  }

  // 簡易的なbase64url変換（デモ用）
  function simpleBase64url(str: string) {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  // 開示可能な要素を作成
  const salt1 = generateSimpleSalt()
  const salt2 = generateSimpleSalt()
  const salt3 = generateSimpleSalt()
  const salt4 = generateSimpleSalt()

  const disclosures = [
    JSON.stringify([salt1, "name", userInfo.name]),
    JSON.stringify([salt2, "studentId", userInfo.studentId]),
    JSON.stringify([salt3, "department", userInfo.department]),
    JSON.stringify([salt4, "status", "enrolled"]),
  ]

  // 簡易的なハッシュ計算（デモ用）
  const disclosureHashes = disclosures.map((disclosure) => {
    // 実際のアプリケーションではSHA-256を使用
    return simpleBase64url(disclosure)
  })

  // JWTペイロード
  const payload = {
    iss: "https://university.example.com",
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日間有効
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "StudentCredential"],
      credentialSubject: {},
    },
    _sd: disclosureHashes,
  }

  // 実際のアプリケーションでは適切な秘密鍵で署名する
  // ここではデモのため署名をシミュレート
  const simulatedJwt = `${simpleBase64url(JSON.stringify(header))}.${simpleBase64url(JSON.stringify(payload))}.SIMULATED_SIGNATURE`

  // SD-JWT形式で返す
  return `${simulatedJwt}~${disclosures.join("~")}`
}

async function fetchUserInfo(userId: string) {
  // 実際のアプリケーションではデータベースから取得
  // ここではデモのためハードコードした値を返す
  return {
    name: "山田 太郎",
    studentId: "S12345678",
    department: "工学部 情報工学科",
    email: "yamada@example.university.edu",
  }
}
