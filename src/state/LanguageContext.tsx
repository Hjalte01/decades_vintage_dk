import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Language, LocalizedText } from '../types'

interface LanguageValue {
  language: Language
  setLanguage: (language: Language) => void
  text: (value: LocalizedText) => string
}

const LanguageContext = createContext<LanguageValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    (localStorage.getItem('decades-language') as Language | null) ?? 'da',
  )
  const setLanguage = (next: Language) => {
    localStorage.setItem('decades-language', next)
    document.documentElement.lang = next
    setLanguageState(next)
  }
  const value = useMemo(() => ({
    language,
    setLanguage,
    text: (copy: LocalizedText) => copy[language] || copy.da,
  }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}
