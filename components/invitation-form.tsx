"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useInvitation } from "@/contexts/invitation-context"
import { EntityType } from "@/contexts/invitation-context"

interface InvitationFormProps {
  type: "Office" | "Lab" | "User" | "Practice" | "Doctor"
  onSuccess?: () => void
}

export function InvitationForm({ type, onSuccess }: InvitationFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { sendInvitation } = useInvitation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: `${type} Name and Email address are required.`,
        variant: "destructive",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      // Determine the entity type based on the invitation type
      const entityType: EntityType = 
        type === "Office" ? "Office" : 
        type === "Lab" ? "Lab" : 
        type === "Doctor" ? "Doctor" :
        type === "Practice" ? "Office" : "Office"

      const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
      const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id

      await sendInvitation({
        name,
        email,
        invited_by: invitedBy,
        type: entityType,
      })

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${name}`,
      })
      
      setName("")
      setEmail("")
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error(`Error sending ${type} invitation:`, error)
      toast({
        title: "Error",
        description: `Failed to send invitation. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder={`${type} Name *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  )
}
