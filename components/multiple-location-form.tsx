"use client"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

type Location = {
  id: number
  name: string
  address?: string
  city?: string
  state?: string
}

export default function MultipleLocation() {
  // Add at the beginning of the component function
  const { user, token, isLoading: authLoading, setCustomerId } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)


  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/login")
    }
  }, [user, router, authLoading])

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user?.customers) {
      const customerLocations = user.customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        type: customer.type,
        role: customer.role
      }))
      setLocations(customerLocations)
      setFilteredLocations(customerLocations)
      setIsLoading(false)
  
      if (customerLocations.length === 1) {
        const singleLocation = customerLocations[0]
        // Call API first, then redirect
        setCustomerId(singleLocation.id).then(() => {
          localStorage.setItem("selectedLocation", JSON.stringify(singleLocation))
          router.replace("/dashboard")
        }).catch((error) => {
          console.error("Failed to set customer ID:", error)
          // Still redirect even if API fails
          localStorage.setItem("selectedLocation", JSON.stringify(singleLocation))
          router.replace("/dashboard")
        })
      }
    }
  }, [user])

  useEffect(() => {
    if (searchQuery) {
      const filtered = locations.filter((location) => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(locations)
    }
  }, [searchQuery, locations])

  const handleLocationSelect = async (locationId: number) => {
    setSelectedLocationId(locationId)

    // Find the selected location
    const selectedLocation = locations.find((loc) => loc.id === locationId)

    if (selectedLocation) {
      try {
        // Call API to set customer ID
        await setCustomerId(selectedLocation.id)

        // Save to localStorage
        localStorage.setItem("selectedLocation", JSON.stringify(selectedLocation))

        toast({
          title: "Location Selected",
          description: `You've selected ${selectedLocation.name}`,
        })

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.replace("/dashboard")
        }, 500)
      } catch (error) {
        console.error("Failed to set customer ID:", error)
        toast({
          title: "Error",
          description: "Failed to select location. Please try again.",
          variant: "destructive",
        })
        setSelectedLocationId(null) // Reset selection on error
      }
    }
  }

  const nextSlide = () => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)
  const prevSlide = () => setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)

  const heroSlides = [
    {
      image: { src: "/images/tooth.png", alt: "digital tooth" },
      title: "Because crowns shouldn't be complicated",
      description: "Focus on great results, not back-and-forth",
    },
    {
      image: { src: "/images/jaw.png", alt: "impression" },
      title: "Simplifying workflows one case at a time",
      description: "Digital dentistry is here. More speed, more accuracy, less stress.",
    },
    {
      image: { src: "/images/braces.png", alt: "digital dental network" },
      title: "One platform for all your case management",
      description: "From scan to smile, everything is just a click away.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Side - Location Selection */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col">
          <div className="max-w-md mx-auto w-full">
            <h1 className="text-3xl font-bold text-[#000000] mb-2">Welcome, {user?.first_name || "User"}</h1>
            <h2 className="text-xl font-bold text-[#000000] mb-6">Choose Location</h2>

            {/* Search Box */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search Location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Error Message */}
            {fetchError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
                <span>{fetchError}</span>
              </div>
            )}

            {/* Location List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="flex min-h-screen items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location.id)}
                    className={`w-full text-left px-4 py-3 border ${
                      selectedLocationId === location.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                    } rounded-md transition-colors`}
                  >
                    {location.name}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No locations found. Please try a different search.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Hero Slides */}
        <div className="w-full md:w-1/2 relative overflow-hidden bg-[#192535]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                currentSlideIndex === index ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={slide.image.src || "/placeholder.svg?height=600&width=600&query=digital dental illustration"}
                alt={slide.image.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col">
                <div className="mb-16">
                  <h2 className="text-[#E1FFFF] font-bold text-2xl md:text-3xl mb-2">{slide.title}</h2>
                  <p className="text-white/90 text-lg">{slide.description}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Controls */}
          <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex space-x-2 items-center">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all mx-1 ${currentSlideIndex === idx ? "bg-white" : "bg-white/50 hover:bg-white/70"}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
