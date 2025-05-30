"use client"

import { useMemo } from "react"

interface SimpleQRCodeProps {
  value: string
  size?: number
}

export function SimpleQRCode({ value, size = 200 }: SimpleQRCodeProps) {
  // Create a simple visual representation of a QR code
  // This is not a real QR code, just a visual representation for demo purposes

  // Create a grid of cells based on the value
  const cells = useMemo(() => {
    const cellCount = 21 // Standard QR code size
    const result = []

    // Create a deterministic pattern based on the value
    const hash = Array.from(value).map((char) => char.charCodeAt(0))

    for (let i = 0; i < cellCount; i++) {
      const row = []
      for (let j = 0; j < cellCount; j++) {
        // Position detection patterns (corners)
        if (
          (i < 7 && j < 7) || // Top-left
          (i < 7 && j >= cellCount - 7) || // Top-right
          (i >= cellCount - 7 && j < 7)
        ) {
          // Bottom-left

          // Outer border
          if (
            i === 0 ||
            i === 6 ||
            i === cellCount - 1 ||
            i === cellCount - 7 ||
            j === 0 ||
            j === 6 ||
            j === cellCount - 1 ||
            j === cellCount - 7
          ) {
            row.push(1)
          }
          // Inner square
          else if (
            (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
            (i >= 2 && i <= 4 && j >= cellCount - 5 && j <= cellCount - 3) ||
            (i >= cellCount - 5 && i <= cellCount - 3 && j >= 2 && j <= 4)
          ) {
            row.push(1)
          }
          // White space
          else {
            row.push(0)
          }
        }
        // Data cells - create a pattern based on the hash
        else {
          const hashIndex = (i * cellCount + j) % hash.length
          row.push((hash[hashIndex] + i + j) % 3 === 0 ? 1 : 0)
        }
      }
      result.push(row)
    }

    return result
  }, [value])

  const cellSize = Math.floor(size / cells.length)

  return (
    <div className="qr-code bg-white p-4 rounded-md" style={{ width: size, height: size }}>
      <div className="qr-code-grid flex flex-col">
        {cells.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, cellIndex) => (
              <div
                key={`${rowIndex}-${cellIndex}`}
                className={`${cell ? "bg-black" : "bg-white"}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
