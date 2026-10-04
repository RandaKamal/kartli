"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { en } from "./dictionaries/en";
import { de } from "./dictionaries/de";

export type Locale = "en" | "de";
export type TranslationDictionary = typeof en;

const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  de,
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export interface LanguageProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

function detectDefaultLocale(): Locale {
  if (typeof window === "undefined") return "en";

  try {
    // 1. Check localStorage
    const saved = localStorage.getItem("kartli_locale");
    if (saved === "en" || saved === "de") {
      return saved;
    }

    // 2. Check cookie
    const match = document.cookie.match(/(?:^|;\s*)kartli_locale=([^;]+)/);
    if (match && (match[1] === "en" || match[1] === "de")) {
      return match[1] as Locale;
    }

    // 3. Detect via navigator.language (de, de-DE, de-AT, de-CH)
    if (typeof navigator !== "undefined" && navigator.language) {
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith("de")) {
        return "de";
      }
    }
  } catch {
    // Graceful fallback on storage access errors
  }

  return "en";
}

export function LanguageProvider({
  children,
  initialLocale,
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return initialLocale || "en";
  });

  // Client-side detection on initial mount if not explicitly set via server cookie
  useEffect(() => {
    const detected = detectDefaultLocale();
    if (detected !== locale) {
      setLocaleState(detected);
    }
    // Update HTML lang attribute
    document.documentElement.lang = detected;
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("kartli_locale", newLocale);
      document.cookie = `kartli_locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch {
      // Graceful fallback
    }
  }, []);

  const t = useMemo(() => dictionaries[locale] || en, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
