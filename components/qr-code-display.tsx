"use client"

import { useMemo } from "react"

interface QRCodeDisplayProps {
  data: string
  size?: number
}

export function QRCodeDisplay({ data, size = 200 }: QRCodeDisplayProps) {
  // Generate a simple visual representation of a QR code using divs
  const qrCodeMatrix = useMemo(() => {
    // Create a deterministic pattern based on the data string
    const hash = hashString(data)

    // Size of the QR code matrix (modules)
    const matrixSize = 21 // Standard for smallest QR code

    // Initialize matrix with all white cells
    const matrix = Array(matrixSize)
      .fill(0)
      .map(() => Array(matrixSize).fill(0))

    // Add position detection patterns (the three large squares in corners)
    // Top-left
    addPositionPattern(matrix, 0, 0)
    // Top-right
    addPositionPattern(matrix, matrixSize - 7, 0)
    // Bottom-left
    addPositionPattern(matrix, 0, matrixSize - 7)

    // Add data modules based on the hash of the input data
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        // Skip position detection patterns
        if ((i < 7 && j < 7) || (i < 7 && j >= matrixSize - 7) || (i >= matrixSize - 7 && j < 7)) {
          continue
        }

        // Use hash to determine if this module should be black or white
        if ((hash[(i + j) % hash.length] + i * j) % 3 === 0) {
          matrix[i][j] = 1
        }
      }
    }

    return matrix
  }, [data])

  // Calculate the size of each module
  const moduleSize = Math.floor(size / qrCodeMatrix.length)

  return (
    <div
      className="qr-code-container bg-white p-4 border rounded-md"
      style={{
        width: size + 16, // Add padding
        height: size + 16 + 20, // Add padding and space for text
      }}
    >
      <div
        className="qr-code-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${qrCodeMatrix.length}, ${moduleSize}px)`,
          gridTemplateRows: `repeat(${qrCodeMatrix.length}, ${moduleSize}px)`,
          gap: "0px",
        }}
      >
        {qrCodeMatrix.map((row, rowIndex) =>
          row.map((cell, cellIndex) => (
            <div
              key={`${rowIndex}-${cellIndex}`}
              className={cell ? "bg-black" : "bg-white"}
              style={{
                width: moduleSize,
                height: moduleSize,
                border: "1px solid #f0f0f0",
              }}
            />
          )),
        )}
      </div>
      <div className="text-center text-xs mt-2">学生証明書 QRコード</div>
    </div>
  )
}

// Add position detection pattern (the three large squares in corners of QR codes)
function addPositionPattern(matrix: number[][], startX: number, startY: number) {
  // Outer square (all black)
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      matrix[startX + i][startY + j] = 1
    }
  }

  // Middle square (white)
  for (let i = 1; i < 6; i++) {
    for (let j = 1; j < 6; j++) {
      matrix[startX + i][startY + j] = 0
    }
  }

  // Inner square (black)
  for (let i = 2; i < 5; i++) {
    for (let j = 2; j < 5; j++) {
      matrix[startX + i][startY + j] = 1
    }
  }
}

// Simple hash function for demonstration
function hashString(str: string): number[] {
  const result = []
  for (let i = 0; i < str.length; i++) {
    result.push(str.charCodeAt(i) % 100)
  }
  return result
}
