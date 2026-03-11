"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type HeaderOverlayState = {
  content: ReactNode | null
  setContent: (content: ReactNode | null) => void
}

const HeaderOverlayContext = createContext<HeaderOverlayState>({
  content: null,
  setContent: () => {},
})

export function HeaderOverlayProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null)
  return (
    <HeaderOverlayContext.Provider value={{ content, setContent }}>
      {children}
    </HeaderOverlayContext.Provider>
  )
}

export function useHeaderOverlay() {
  return useContext(HeaderOverlayContext)
}
