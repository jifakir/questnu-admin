import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, UserCog } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  isOptionalPhoneNumber,
  PhoneNumberInput,
} from '@/components/ui/phone-number-input'
import { fetchMyProfile, updateMyProfile } from '@/api'
import { useAuth } from '@/auth'

export function ProfilePage() {
  const { email } = useAuth()
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    fetchMyProfile()
      .then((profile) => {
        if (cancelled) return
        setName(profile.name ?? '')
        setWhatsapp(profile.whatsappNumber ?? '')
        setRole(profile.role)
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }
    if (!isOptionalPhoneNumber(whatsapp)) {
      toast.error('Enter a valid phone number')
      return
    }
    setBusy(true)
    try {
      const profile = await updateMyProfile({
        name: trimmedName,
        whatsappNumber: whatsapp.trim(),
      })
      setName(profile.name ?? '')
      setWhatsapp(profile.whatsappNumber ?? '')
      toast.success('Profile updated')
    } catch (e: unknown) {
      toast.error('Could not update profile', {
        description: e instanceof Error ? e.message : 'Request failed',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UserCog}
        title="Profile"
        description="Update the name and WhatsApp number on your account. Email and role stay with an administrator."
      />

      <Card className="max-w-xl rounded-2xl border-border/70">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading profile
            </div>
          ) : err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={(e) => void submit(e)}>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">{email ?? '—'}</p>
                {role ? (
                  <Badge variant="approved" className="capitalize">
                    {role}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  required
                  className="rounded-xl"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-whatsapp">WhatsApp</Label>
                <PhoneNumberInput
                  id="profile-whatsapp"
                  value={whatsapp}
                  onChange={setWhatsapp}
                  disabled={busy}
                />
              </div>

              <div>
                <Button type="submit" className="rounded-xl" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save profile
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
