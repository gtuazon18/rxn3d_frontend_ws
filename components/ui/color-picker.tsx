"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  predefinedColors?: string[]
}

export function ColorPicker({ value, onChange, predefinedColors = [] }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'hue' | 'sl' | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const hueRef = useRef<HTMLDivElement>(null)
  const slRef = useRef<HTMLDivElement>(null)

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Initialize HSL values from hex value (only once on mount)
  useEffect(() => {
    if (value && value.startsWith('#') && !isInitialized) {
      const { h, s, l } = hexToHsl(value)
      setHue(h)
      setSaturation(s)
      setLightness(l)
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  // Update hex value when HSL changes (but avoid circular updates)
  const updateHexValue = useCallback(() => {
    const hex = hslToHex(hue, saturation, lightness)
    if (hex !== value) {
      onChange(hex)
    }
  }, [hue, saturation, lightness, value, onChange])

  useEffect(() => {
    if (isInitialized && !isDragging) {
      updateHexValue()
    }
  }, [hue, saturation, lightness, isInitialized, isDragging, updateHexValue])

  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragType('hue')
    updateHue(e)
  }

  const handleSlMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragType('sl')
    updateSaturationLightness(e)
  }

  const updateHue = (e: React.MouseEvent | MouseEvent) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setHue(percentage * 360)
  }

  const updateSaturationLightness = (e: React.MouseEvent | MouseEvent) => {
    if (!slRef.current) return
    const rect = slRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100))
    setSaturation(s)
    setLightness(l)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      if (dragType === 'hue') {
        updateHue(e)
      } else if (dragType === 'sl') {
        updateSaturationLightness(e)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragType(null)
      // Update hex value after dragging ends
      setTimeout(() => {
        const hex = hslToHex(hue, saturation, lightness)
        if (hex !== value) {
          onChange(hex)
        }
      }, 0)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragType])

  const defaultPredefinedColors = [
    "#000000", // Black
    "#0000FF", // Blue
    "#00FF00", // Green
    "#FFFF00", // Yellow
    "#FF0000", // Red
    "#00FFFF", // Light blue
    "#800080", // Purple
    "#000080", // Dark blue
  ]

  const colors = predefinedColors.length > 0 ? predefinedColors : defaultPredefinedColors

  // Close picker when clicking outside
  const pickerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="outline"
        className="w-8 h-8 p-0 border border-gray-300"
        style={{ backgroundColor: value }}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
          {/* Main color selection area */}
          <div
            ref={slRef}
            className="w-full h-48 rounded-lg cursor-crosshair relative mb-4"
            style={{
              background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%)), linear-gradient(to top, black, transparent)`
            }}
            onMouseDown={handleSlMouseDown}
          >
            {/* Saturation/Lightness selector */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-2 -translate-y-2"
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                backgroundColor: hslToHex(hue, saturation, lightness)
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="w-full h-6 rounded-lg cursor-pointer relative mb-4"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
            onMouseDown={handleHueMouseDown}
          >
            {/* Hue selector */}
            <div
              className="absolute w-4 h-6 border-2 border-white rounded shadow-lg transform -translate-x-2"
              style={{
                left: `${(hue / 360) * 100}%`,
                backgroundColor: `hsl(${hue}, 100%, 50%)`
              }}
            />
          </div>

          {/* Current color display and predefined colors */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded border border-gray-300"
              style={{ backgroundColor: value }}
            />
            
            <div className="flex-1">
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      value === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      const { h, s, l } = hexToHsl(color)
                      setHue(h)
                      setSaturation(s)
                      setLightness(l)
                      onChange(color)
                      setIsOpen(false) // Close picker after selecting a predefined color
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500 hover:border-gray-500"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'color'
                      input.value = value
                      input.onchange = (e) => {
                        const color = (e.target as HTMLInputElement).value
                        const { h, s, l } = hexToHsl(color)
                        setHue(h)
                        setSaturation(s)
                        setLightness(l)
                        onChange(color)
                        setIsOpen(false) // Close picker after selecting custom color
                      }
                      input.click()
                    }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
