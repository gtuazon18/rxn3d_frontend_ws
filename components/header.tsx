"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LoadingOverlay from "@/components/ui/loading-overlay"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X, Settings, QrCode, AlertCircle, Loader2, RotateCcw } from "lucide-react"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "react-i18next"
import { useLocation } from "@/contexts/location-context"
import { useDriverSlip } from "@/contexts/DriverSlipContext"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumb } from "@/components/breadcrumb"
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser"
import { preloadComponentsByRoute } from "@/lib/code-splitting"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import DriverHistoryModal from "./driver-history-modal"

interface HeaderProps {
  toggleSidebar?: () => void
  onNewSlip?: () => void
}

interface ScanResult {
  id: string
  text: string
  format: string
  timestamp: Date
  validated: boolean
  type: "qr" | "barcode" | "unknown"
}

interface ScannerState {
  isOpen: boolean
  isLoading: boolean
  isScanning: boolean
  error: string | null
  hasPermission: boolean
}

// Add a Location type for clarity
interface Location {
  id: string | number;
  name: string;
  [key: string]: any;
}

export function Header({ toggleSidebar, onNewSlip }: HeaderProps) {
  const { user, logout } = useAuth()
  const [scannerState, setScannerState] = useState<ScannerState>({
    isOpen: false,
    isLoading: false,
    isScanning: false,
    error: null,
    hasPermission: false,
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [selectedFormats, setSelectedFormats] = useState<BarcodeFormat[]>([
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
  ])
  const [autoValidate, setAutoValidate] = useState(true)
  // use a ref for last scan time to avoid async state updates causing duplicate handling
  const lastScanTimeRef = useRef<number>(0)
  // processingRef prevents concurrent handling of the same detection
  const processingRef = useRef(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [qrScanData, setQrScanData] = useState<any>(null)
  const { t } = useTranslation()
  // Use Location type for selectedLocation and setSelectedLocation
  const { locations, selectedLocation, setSelectedLocation } = useLocation(); // selectedLocation is a number (id)
  const { scanQrCode, submitScannedSlips } = useSlipContext()
  const { toast } = useToast();
  const pathname = usePathname() || "";
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedCodeRef = useRef<string>("");

  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isSuperAdmin = userRoles.includes("superadmin")

  // Load scan history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("qr-scan-history")
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
        setScanHistory(parsed)
      } catch (error) {
        console.error("Failed to load scan history:", error)
      }
    }
  }, [])

  // Save scan history to localStorage
  const saveScanHistory = useCallback((history: ScanResult[]) => {
    try {
      localStorage.setItem("qr-scan-history", JSON.stringify(history))
    } catch (error) {
      console.error("Failed to save scan history:", error)
    }
  }, [])

  // Validate scanned code
  const validateScanResult = useCallback(
    (text: string, format: string): { isValid: boolean; type: ScanResult["type"]; message?: string } => {
      // Basic validation patterns
      const patterns = {
        url: /^https?:\/\/.+/i,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s\-$$$$]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        labId: /^LAB-\d{6}$/i,
        caseId: /^CASE-\d{8}$/i,
      }

      if (format.includes("QR")) {
        if (patterns.url.test(text)) return { isValid: true, type: "qr", message: "Valid URL" }
        if (patterns.email.test(text)) return { isValid: true, type: "qr", message: "Valid Email" }
        if (patterns.labId.test(text)) return { isValid: true, type: "qr", message: "Lab ID" }
        if (patterns.caseId.test(text)) return { isValid: true, type: "qr", message: "Case ID" }
        return { isValid: true, type: "qr" }
      }

      if (format.includes("EAN") || format.includes("CODE")) {
        return {
          isValid: text.length >= 8,
          type: "barcode",
          message: text.length >= 8 ? "Valid Product Code" : "Invalid Product Code",
        }
      }

      return { isValid: false, type: "unknown", message: "Unknown format" }
    },
    [],
  )

  // Handle automatic actions based on scan result
  const handleAutomaticActions = useCallback(async (result: ScanResult) => {
    try {
      // Check if the scanned text matches our QR code format for case/slip URLs
      const urlMatch = result.text.match(/\/case\/(\d+)\?slips=([0-9,]+)/)
      
      if (urlMatch) {
        // This is already handled in handleScanSuccess, so we skip it here
        return
      }

      // Fallback to existing automatic actions if not a case/slip QR code
      if (result.text.startsWith("LAB-")) {
      } else if (result.text.startsWith("CASE-")) {
      } else if (result.text.startsWith("http")) {
      } else if (result.text.includes("@") && result.text.includes(".")) {
        try {
          window.open(`mailto:${result.text}`, "_blank")
        } catch (error) {
          console.error("Failed to open email client:", error)
        }
      } else if (/^\+?[\d\s\-()]+$/.test(result.text) && result.text.replace(/\D/g, "").length >= 10) {
        try {
          window.open(`tel:${result.text}`, "_blank")
        } catch (error) {
          console.error("Failed to open phone dialer:", error)
        }
      }
    } catch (error) {
      console.error("Error in automatic actions:", error)
    }
  }, [])

  // Handle successful scan
  const handleScanSuccess = useCallback(
    async (text: string, format: string) => {
      const now = Date.now()

      // Prevent concurrent handling from multiple decode callbacks
      if (processingRef.current) {
        return
      }

      // mark as processing immediately
      processingRef.current = true

      try {
        // Prevent duplicate scans within 3 seconds AND same content
        if (now - lastScanTimeRef.current < 3000 && lastScannedCodeRef.current === text) {
          return
        }

        lastScanTimeRef.current = now
        lastScannedCodeRef.current = text

        const validation = autoValidate ? validateScanResult(text, format) : { isValid: true, type: "unknown" as const }

        const scanResult: ScanResult = {
          id: `scan-${now}`,
          text,
          format,
          timestamp: new Date(),
          validated: validation.isValid,
          type: validation.type,
        }

        const newHistory = [scanResult, ...scanHistory].slice(0, 100) // Keep last 100 scans
        setScanHistory(newHistory)
        saveScanHistory(newHistory)


        // Check if the scanned content is a URL that contains case and slip information
        const urlMatch = text.match(/\/case\/(\d+)\?slips=([0-9,]+)/)


        if (urlMatch) {
          const caseId = parseInt(urlMatch[1])
          const slipIds = urlMatch[2].split(',').map(id => parseInt(id))


          try {
            const res: any = await scanQrCode(caseId, slipIds)

            if (res && res.success) {

              // Store the scan data for the modal
              setQrScanData(res)

              // Close the scanner
              closeScanner()

              // Show the driver history modal with the scan data
              setShowDriverHistoryModal(true)


              toast({
                title: "QR Scan Successful",
                description: `Found ${res.scanned_cases_count} case(s) for delivery`,
                duration: 3000,
              })
            } else {
              toast({
                title: "QR Scan Failed",
                description: res?.message || "Failed to process QR code",
                variant: "destructive",
                duration: 5000,
              })
            }
          } catch (error) {
            console.error("QR scan error:", error)
            toast({
              title: "QR Scan Error",
              description: "Failed to scan QR code",
              variant: "destructive",
              duration: 5000,
            })
          }

          return // Exit early, don't process as regular URL
        }

        // For other non-URL codes, show regular scan success message
        toast({
          title: "Code Scanned Successfully",
          description: validation.message || `${format}: ${text.substring(0, 30)}${text.length > 30 ? "..." : ""}`,
          duration: 2000,
        })

        // Announce to screen readers
        const announcement = urlMatch
          ? `QR code scanned successfully: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
          : `Scanned ${validation.type} code: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`

        const ariaLive = document.createElement("div")
        ariaLive.setAttribute("aria-live", "polite")
        ariaLive.setAttribute("aria-atomic", "true")
        ariaLive.className = "sr-only"
        ariaLive.textContent = announcement
        document.body.appendChild(ariaLive)
        setTimeout(() => document.body.removeChild(ariaLive), 1000)

        // Auto-close if not in batch mode
        if (!batchMode) {
          setTimeout(() => closeScanner(), 1500)
        }

        // Trigger automatic actions based on code type
        await handleAutomaticActions(scanResult)
      } catch (err) {
        console.error("Error in handleScanSuccess:", err)
      } finally {
        // Always clear processing flag so the scanner can be reused
        processingRef.current = false
      }
    },
    [scanHistory, saveScanHistory, autoValidate, validateScanResult, batchMode, toast, handleAutomaticActions],
  )

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera for better QR scanning
          width: { ideal: 1920, min: 1280 }, // Higher resolution for better scanning
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }, // Higher frame rate for smoother scanning
        },
        audio: false // Explicitly disable audio
      })
      setScannerState((prev) => ({ ...prev, hasPermission: true, error: null }))
      return stream
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Camera access denied"
      setScannerState((prev) => ({ ...prev, hasPermission: false, error: errorMessage }))
      throw error
    }
  }, [])

  // Start scanner
  const startScanner = useCallback(async () => {
    if (isDecoding) {
      return
    }

    setIsDecoding(true)
    setScannerState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const mediaStream = await requestCameraPermission()
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve
          }
        })
      }

      const codeReader = new BrowserMultiFormatReader()

      // Set hints for better QR code detection
      const hints = new Map()
      hints.set(2, [BarcodeFormat.QR_CODE]) // Focus only on QR codes for better performance
      hints.set(3, true) // TRY_HARDER for better detection
      hints.set(10, true) // PURE_BARCODE for cleaner detection
      codeReader.hints = hints

      codeReaderRef.current = codeReader

      setScannerState((prev) => ({ ...prev, isLoading: false, isScanning: true }))

      // Use continuous scanning with better error handling
      const startContinuousScanning = async () => {
        if (!videoRef.current || !codeReaderRef.current) return;

        try {
          // Use decodeFromVideoDevice for continuous scanning
          await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
            if (result) {
              // If already processing, ignore duplicate detections
              if (processingRef.current) return

              const text = result.getText()
              const formatStr = result.getBarcodeFormat().toString()


              // Stop scanning immediately after detection to prevent further callbacks
              if (codeReaderRef.current) {
                try {
                  ;(codeReaderRef.current as any)?.reset?.()
                } catch (e) {
                }
              }

              // Call our success handler (async). The handler sets processingRef and clears it in finally.
              void handleScanSuccess(text, formatStr)
            }
            // Don't log NotFoundException errors as they're normal during scanning
            if (error && error.name !== "NotFoundException") {
              console.error("Scan error:", error)
            }
          })
        } catch (error) {
          console.error("Error starting continuous scanning:", error)
        }
      }

      // Start continuous scanning
      startContinuousScanning()
    } catch (error) {
      console.error("Error starting scanner:", error)
      setIsDecoding(false)
      setScannerState((prev) => ({
        ...prev,
        isLoading: false,
        isScanning: false,
        error: error instanceof Error ? error.message : "Failed to start scanner",
      }))

      toast({
        title: "Scanner Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }, [
    selectedFormats,
    requestCameraPermission,
    handleScanSuccess,
    toast,
    isDecoding,
    scannerState.isOpen,
    batchMode,
    scanHistory.length,
  ])

  // Close scanner
  const closeScanner = useCallback(() => {
    setIsDecoding(false)
    lastScannedCodeRef.current = ""
    // Reset processing and last scan time so scanner can be reopened cleanly
    processingRef.current = false
    lastScanTimeRef.current = 0

    // Stop the code reader first
    if (codeReaderRef.current) {
      try {
        ;(codeReaderRef.current as any)?.reset?.()
        codeReaderRef.current = null
      } catch (error) {
      }
    }

    // Clear any timeouts
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    // Stop all video tracks to turn off camera
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
      setStream(null)
    }

    // Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setScannerState({
      isOpen: false,
      isLoading: false,
      isScanning: false,
      error: null,
      hasPermission: false,
    })
  }, [stream])

  // Open scanner
  const openScanner = useCallback(() => {
    setScannerState((prev) => {
      const newState = { ...prev, isOpen: true }
      return newState
    })
  }, [])

  // Effect to start scanner when dialog opens
  useEffect(() => {
    if (scannerState.isOpen && !scannerState.isScanning && !scannerState.isLoading && !isDecoding) {
      startScanner()
    }
  }, [scannerState.isOpen, scannerState.isScanning, scannerState.isLoading, isDecoding])

  // Debug effect to track modal state changes
  useEffect(() => {
  }, [showDriverHistoryModal, qrScanData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
      if (codeReaderRef.current) {
        codeReaderRef.current = null
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Copy to clipboard
  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        toast({
          title: "Copied to clipboard",
          description: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        })
      } catch (error) {
        console.error("Failed to copy:", error)
      }
    },
    [toast],
  )

  // Clear scan history
  const clearScanHistory = useCallback(() => {
    setScanHistory([])
    localStorage.removeItem("qr-scan-history")
    toast({
      title: "History cleared",
      description: "All scan history has been removed.",
    })
  }, [toast])

  const getPrimaryRole = () => {
    if (userRoles.includes("superadmin")) return "Super Admin"
    if (userRoles.includes("lab_admin")) return "Lab Admin"
    if (userRoles.includes("office_admin")) return "Office Admin"
    if (userRoles.includes("doctor_admin")) return "Doctor Admin"
    if (userRoles.includes("lab_user")) return "Lab User"
    if (userRoles.includes("office_user")) return "Office User"
    if (userRoles.includes("doctor")) return "Doctor"
    return "User"
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    const names = name.split(" ")
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  // Add a type guard for Location
  function isLocation(obj: any): obj is Location {
    return obj && (typeof obj.id === 'number' || typeof obj.id === 'string') && typeof obj.name === 'string';
  }

  // Ensure safeLocations is only valid Location objects
  const safeLocations = Array.isArray(locations) ? locations.filter(isLocation) : []

  const handleLocationChange = (value: string) => {
    const locationId = Number(value);
    setSelectedLocation(locationId);
    const location = safeLocations.find((loc) => loc.id === locationId);
    if (location) {
      localStorage.setItem("selectedLocation", JSON.stringify(location));
      toast({
        title: "Location Selected",
        description: `You've selected ${location.name}`,
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row h-auto min-h-16 lg:min-h-20 items-stretch sm:items-center px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-12 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 py-2 sm:py-2.5 md:py-3 lg:py-3.5">
          {/* Top Row - Main Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-1 md:gap-2 lg:gap-3 xl:gap-4 flex-1 min-w-0">
            {/* Enhanced Left Section */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 flex-wrap min-w-0 flex-1 sm:flex-initial">
              <button
                className="bg-[#1162a8] hover:bg-blue-700 text-white px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
                onClick={() => {
                  // Remove caseDesignCache from localStorage when starting a new slip
                  localStorage.removeItem("caseDesignCache");
                  // Navigate to standalone Add Slip page
                  router.replace("/add-slip");
                  // Call onNewSlip callback if provided
                  if (onNewSlip) {
                    onNewSlip();
                  }
                }}
              >
                <span className="hidden md:inline">{t("header.newSlip", "+ New slip")}</span>
                <span className="hidden sm:inline md:hidden">+ Slip</span>
                <span className="sm:hidden">+ Slip</span>
              </button>
              <button className="bg-[#1162a8] hover:bg-blue-700 text-white px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-colors shadow-sm whitespace-nowrap flex-shrink-0">
                <span className="hidden md:inline">{t("header.newOffice", "+ New Office")}</span>
                <span className="hidden sm:inline md:hidden">+ Office</span>
                <span className="sm:hidden">+ Office</span>
              </button>
              <button
                className="bg-[#1162a8] hover:bg-blue-700 text-white px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium flex items-center gap-1 sm:gap-1.5 md:gap-2 transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
                onClick={openScanner}
                aria-label={t("header.openScanner", "Open QR code scanner")}
              >
                <QrCode className="text-white w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5 flex-shrink-0" />
                <span className="hidden md:inline">{t("header.scanCode", "Scan Code")}</span>
                <span className="hidden sm:inline md:hidden">Scan</span>
                <span className="sm:hidden">Scan</span>
                {scanHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 lg:ml-1.5 text-[10px] sm:text-xs md:text-sm bg-white text-[#1162a8] flex-shrink-0">
                    {scanHistory.length}
                  </Badge>
                )}
              </button>
            </div>

            {/* Center Section - Search (for SuperAdmin) */}
            {isSuperAdmin && (
              <div className="flex-1 sm:flex-initial w-full sm:w-auto min-w-0 max-w-full lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto sm:mx-0">
                <div className="relative w-full">
                  <Search className="absolute left-2 sm:left-3 lg:left-4 xl:left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-5 xl:w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("header.searchLab", "Search Lab")}
                    className="w-full pl-8 sm:pl-10 lg:pl-12 xl:pl-14 pr-3 sm:pr-4 lg:pr-5 py-1.5 sm:py-2 lg:py-2.5 xl:py-3 border-gray-300 rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11"
                  />
                </div>
              </div>
            )}

            {/* Enhanced Right Section - Pushed to right edge */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 2xl:gap-5 flex-shrink-0 ml-auto">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              {!isSuperAdmin && safeLocations.length > 0 && (
                <div className="hidden sm:block min-w-0">
                  <Select
                    value={selectedLocation !== null ? selectedLocation.toString() : ""}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[200px] lg:w-[240px] xl:w-[280px] 2xl:w-[320px] border-gray-300 rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11">
                      <SelectValue placeholder={t("header.selectLocation", "Select a location")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg">
                      <SelectGroup>
                        <SelectLabel className="font-medium text-gray-700">Locations</SelectLabel>
                        {safeLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()} className="hover:bg-blue-50">
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <NotificationDropdown />
              
              <div className="sm:hidden">
                <LanguageSwitcher />
              </div>
              
              <Settings className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 xl:h-6 xl:w-6 text-gray-600 hover:text-[#1162a8] cursor-pointer transition-colors flex-shrink-0" />
              
              {/* Enhanced User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-11 xl:w-11 rounded-full hover:bg-gray-100 flex-shrink-0 p-0">
                    <Avatar className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-11 xl:w-11 ring-2 ring-gray-200">
                      <AvatarImage
                        src={user?.image || "/images/default-lab-avatar.png"}
                        alt={user?.first_name || t("header.user")}
                      />
                      <AvatarFallback className="bg-[#1162a8] text-white font-medium text-[10px] sm:text-xs md:text-sm lg:text-base">
                        {getInitials(user?.first_name || "")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 lg:w-64 rounded-lg shadow-lg" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm lg:text-base font-medium">{user?.first_name || t("header.user")}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="hover:bg-red-50 text-red-600 text-sm lg:text-base">
                    {t("header.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Location Selector for Mobile (when not SuperAdmin) */}
          {!isSuperAdmin && safeLocations.length > 0 && (
            <div className="sm:hidden w-full order-3">
              <Select
                value={selectedLocation !== null ? selectedLocation.toString() : ""}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-full border-gray-300 rounded-md focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] text-xs h-8">
                  <SelectValue placeholder={t("header.selectLocation", "Select a location")} />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg">
                  <SelectGroup>
                    <SelectLabel className="font-medium text-gray-700">Locations</SelectLabel>
                    {safeLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()} className="hover:bg-blue-50">
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Enhanced Breadcrumb Section */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-12 pb-2 sm:pb-3 md:pb-4 lg:pb-5 xl:pb-6 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-gray-900 whitespace-nowrap">{getPrimaryRole()}</h1>
            <div className="min-w-0 flex-1 w-full sm:w-auto">
              <Breadcrumb />
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Scanner Dialog with maintained functionality */}
      <Dialog
        open={scannerState.isOpen}
        onOpenChange={(open) => {
          if (!open) closeScanner()
        }}
      >
        <DialogContent className="sm:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] 2xl:max-w-[900px] max-w-[95vw] w-full mx-auto overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-sm sm:text-base lg:text-lg xl:text-xl">
              <span>QR Code Scanner: Position QR code in the frame</span>
              <Button variant="ghost" size="icon" onClick={closeScanner} className="h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10">
                <X className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Scanner view */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5 xl:space-y-6">
            <LoadingOverlay
              isLoading={scannerState.isLoading}
              title="Loading camera..."
              message="Please wait while we initialize the camera"
              zIndex={99999}
            />

            {scannerState.error && (
              <div className="text-center p-3 sm:p-4 lg:p-5 xl:p-6 bg-red-50 rounded-lg lg:rounded-xl transform transition-all duration-300 hover:scale-105">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 mx-auto mb-2 text-red-500 animate-bounce" />
                <p className="text-red-700 text-sm sm:text-base lg:text-lg xl:text-xl">{scannerState.error}</p>
                <Button className="mt-2 lg:mt-3 xl:mt-4 transform transition-transform hover:scale-105 text-xs sm:text-sm lg:text-base xl:text-lg px-4 lg:px-6 xl:px-8 py-2 lg:py-2.5 xl:py-3" onClick={startScanner}>
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2 animate-spin" />
                  Retry
                </Button>
              </div>
            )}

            <div className="relative aspect-video bg-black rounded-lg lg:rounded-xl overflow-hidden shadow-2xl">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                autoPlay 
                playsInline 
                muted
                style={{
                  filter: 'contrast(1.2) brightness(1.1)', // Enhance contrast for better QR detection
                }}
              />

              {scannerState.isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Larger, more visible scanning frame */}
                  <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 2xl:w-96 2xl:h-96 relative">
                    {/* Main scanning frame */}
                    <div className="w-full h-full border-4 border-white/30 rounded-2xl relative">
                      {/* Corner brackets for better visibility */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-2xl"></div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-2xl"></div>
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-2xl"></div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-2xl"></div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                      <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping opacity-75"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay to help with focus */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
            </div>

            {/* Recent scans */}
            {scanHistory.length > 0 && (
              <div className="space-y-2 lg:space-y-3 xl:space-y-4">
                <h4 className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium">Recent Scans</h4>
                <div className="space-y-1 lg:space-y-2 max-h-24 sm:max-h-32 lg:max-h-40 xl:max-h-48 overflow-y-auto">
                  {scanHistory.slice(0, 3).map((scan, index) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-2 sm:p-2.5 lg:p-3 xl:p-4 bg-muted rounded-lg lg:rounded-xl text-xs sm:text-sm lg:text-base transform transition-all duration-300 hover:scale-105 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                        <span className="font-mono truncate">{scan.text.substring(0, 20)}...</span>
                        <Badge variant="outline" className="text-xs sm:text-sm lg:text-base flex-shrink-0">
                          {scan.format}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(scan.text)}
                        className="transform transition-transform hover:scale-110 flex-shrink-0 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2"
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 sm:gap-3 lg:gap-4 xl:gap-5 flex-wrap">
              <Button
                onClick={startScanner}
                disabled={scannerState.isScanning || isDecoding}
                className="transform transition-all duration-200 hover:scale-105 hover:shadow-lg text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5 flex-1 sm:flex-none"
              >
                {scannerState.isScanning ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="hidden sm:inline">Scanning...</span>
                    <span className="sm:hidden">Scan...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Start Scanner</span>
                    <span className="sm:hidden">Start</span>
                  </>
                )}
              </Button>
              <Button
                onClick={closeScanner}
                variant="outline"
                className="transform transition-all duration-200 hover:scale-105 text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5"
              >
                Close
              </Button>
              <Button
                onClick={clearScanHistory}
                variant="outline"
                disabled={scanHistory.length === 0}
                className="transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100 text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5 hidden sm:inline-flex"
              >
                Clear History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver History Modal */}
      {qrScanData && (
        <DriverHistoryModal
          isOpen={showDriverHistoryModal}
          onClose={() => {
            setShowDriverHistoryModal(false);
            setQrScanData(null);
          }}
          qrScanData={qrScanData.data}
        />
      )}

    </>
  )
}
