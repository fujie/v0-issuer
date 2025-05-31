/** @type {import('next').NextConfig} */
const nextConfig = {
  // ドットで始まるパスを許可する設定
  async rewrites() {
    return [
      {
        source: '/.well-known/openid-credential-issuer',
        destination: '/api/well-known/openid-credential-issuer',
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
