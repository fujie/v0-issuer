"use client"

import { useState, useEffect } from "react"

interface QRCodeFallbackProps {
  data: string
  size?: number
}

export function QRCodeFallback({ data, size = 200 }: QRCodeFallbackProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Try multiple QR code services
  const qrServices = [
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`,
    `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}&choe=UTF-8`,
  ]

  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)

  const handleImageError = () => {
    if (currentServiceIndex < qrServices.length - 1) {
      setCurrentServiceIndex(currentServiceIndex + 1)
      setImageError(false)
    } else {
      setImageError(true)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  // Reset when data changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setCurrentServiceIndex(0)
  }, [data])

  if (imageError) {
    // Fallback: Show a simple visual representation
    return (
      <div className="qr-code-fallback bg-white border rounded-md p-4" style={{ width: size, height: size }}>
        <div className="w-full h-full bg-gray-100 rounded-md flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <div className="grid grid-cols-3 gap-1 mb-2">
              {/* Simple QR-like pattern */}
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 ${i % 3 === 0 || i === 4 || i === 8 ? "bg-black" : "bg-white"} border`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">QRコード</p>
          </div>
          <div className="text-xs text-gray-500 text-center px-2">
            <p className="mb-1">データ:</p>
            <p className="break-all">{data.substring(0, 50)}...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="qr-code-container bg-white border rounded-md p-4">
      {!imageLoaded && (
        <div
          className="bg-gray-100 animate-pulse rounded-md flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <p className="text-xs text-gray-500">QRコード読み込み中...</p>
        </div>
      )}
      <img
        src={qrServices[currentServiceIndex] || "/placeholder.svg"}
        alt="QRコード"
        width={size}
        height={size}
        className={`rounded-md ${imageLoaded ? "block" : "hidden"}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
      />
    </div>
  )
}
