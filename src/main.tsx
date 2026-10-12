import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import './index.css'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider delayDuration={150}>
        <App />
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="light"
          toastOptions={{
            className:
              'rounded-xl border border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05),0_18px_40px_-20px_hsl(var(--brand-shadow)/0.3)]',
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
