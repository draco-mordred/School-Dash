import { useCallback } from "react";
import type { Language } from "@/lib/translations";
import { getTranslation, languageNames } from "@/lib/translations";

export const useLanguage = (language: Language) => {
  const t = useCallback(
    (key: string): string => {
      return getTranslation(language, key);
    },
    [language]
  );

  return { t, language, languageNames };
};
