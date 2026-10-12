import * as React from 'react'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-xl',
} as const

export type AppModalSize = keyof typeof sizeClasses

type AppModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  size?: AppModalSize
  className?: string
  children: React.ReactNode
}

/** Standard app modal: viewport-capped shell with an auto-scrolling body region. */
export function AppModal({
  open,
  onOpenChange,
  size = 'md',
  className,
  children,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90vh,900px)] flex-col gap-0 overflow-hidden rounded-2xl p-0',
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function AppModalHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return (
    <DialogHeader
      className={cn('shrink-0 space-y-1.5 px-6 pt-6', className)}
      {...props}
    />
  )
}

/** Scrolls automatically when content exceeds the modal height. */
export function AppModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', className)}
      {...props}
    />
  )
}

export function AppModalFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      className={cn('shrink-0 border-t bg-background px-6 py-4', className)}
      {...props}
    />
  )
}

/** Wrap a form so body scrolls and footer stays pinned. */
export function AppModalForm({
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      {...props}
    />
  )
}
