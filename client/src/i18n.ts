/**
 * GranWatch i18n — 8 languages, zero app-store updates.
 *
 * The native shells load all UI from the server (server.url), so translations
 * ship like any web deploy. Language resolution order:
 *   1. ?lang= querystring on the URL (e.g. shared links — see detection below)
 *   2. explicit user choice (localStorage "gw-lang", set by LanguagePicker)
 *   3. device/browser language (navigator)
 *   4. English
 *
 * Locale files live in client/src/locales/*.json. Keep keys in sync across
 * all 8 files — en.json is the source of truth. Agents/native speakers polish
 * their market's file; machine-first is acceptable for launch (Konna, Aug 13).
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import af from "./locales/af.json";
import nl from "./locales/nl.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import fil from "./locales/fil.json";

export const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
  { code: "en",  label: "English",    flag: "🇬🇧" },
  { code: "af",  label: "Afrikaans",  flag: "🇿🇦" },
  { code: "nl",  label: "Nederlands", flag: "🇳🇱" },
  { code: "fr",  label: "Français",   flag: "🇫🇷" },
  { code: "de",  label: "Deutsch",    flag: "🇩🇪" },
  { code: "es",  label: "Español",    flag: "🇪🇸" },
  { code: "pt",  label: "Português",  flag: "🇧🇷" },
  { code: "fil", label: "Filipino",   flag: "🇵🇭" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      af: { translation: af },
      nl: { translation: nl },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      pt: { translation: pt },
      fil: { translation: fil },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "af", "nl", "fr", "de", "es", "pt", "fil"],
    nonExplicitSupportedLngs: true, // pt-BR → pt, de-AT → de, etc.
    detection: {
      // "querystring" lets a shared link force a language, e.g.
      // https://granwatch.app/?lang=pt — and it gets cached to
      // localStorage too, so the choice sticks after that first visit.
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "gw-lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false,
  });

// Keep <html lang> in sync (accessibility + SEO signals in the SPA shell)
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
