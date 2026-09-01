"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { dictionaries, Locale, TranslationKey } from "@/locales";

export const LANGUAGE_COOKIE_NAME = "kartli_lang";

interface I18nContextType {
  lang: Locale;
  setLang: (lang: Locale) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialLang?: Locale;
}) {
  const [lang, setLangState] = useState<Locale>(initialLang);

  useEffect(() => {
    // Check cookie or localStorage on mount
    try {
      const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE_NAME}=([^;]*)`));
      const cookieLang = match ? decodeURIComponent(match[1]) as Locale : null;
      if (cookieLang === "en" || cookieLang === "de") {
        setLangState(cookieLang);
        document.documentElement.lang = cookieLang;
      }
    } catch {
      // Ignore
    }
  }, []);

  const setLang = useCallback((newLang: Locale) => {
    setLangState(newLang);
    try {
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLang;
    } catch {
      // Ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[lang] || dictionaries.en;
      let text = (dict as any)[key] || (dictionaries.en as any)[key] || key;

      if (params && typeof text === "string") {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
      }

      return text;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: "en" as Locale,
      setLang: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let text = (dictionaries.en as any)[key] || key;
        if (params && typeof text === "string") {
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
          });
        }
        return text;
      },
    };
  }
  return context;
}
