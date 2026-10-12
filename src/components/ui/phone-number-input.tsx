import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

import { cn } from '@/lib/utils'

import './phone-number-input.css'

type PhoneNumberInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  className?: string
}

/** Empty is allowed. A filled value must be a real international number. */
export function isOptionalPhoneNumber(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return isValidPhoneNumber(trimmed)
}

function toInternational(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('0')) return `+880${digits.slice(1)}`
  return `+${digits}`
}

export function PhoneNumberInput({
  id,
  value,
  onChange,
  disabled,
  required,
  placeholder = '1XXXXXXXXX',
  className,
}: PhoneNumberInputProps) {
  const international = toInternational(value)
  return (
    <PhoneInput
      international
      defaultCountry="BD"
      countries={['BD']}
      countryCallingCodeEditable={false}
      countrySelectProps={{ disabled: true, 'aria-label': 'Bangladesh' }}
      value={international || undefined}
      onChange={(next) => onChange(next ?? '')}
      disabled={disabled}
      limitMaxLength
      placeholder={placeholder}
      numberInputProps={{
        id,
        required,
        autoComplete: 'tel',
      }}
      className={cn('phone-number-input', className)}
    />
  )
}
