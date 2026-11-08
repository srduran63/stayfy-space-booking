import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import he from './locales/he.json'
import it from './locales/it.json'
import ja from './locales/ja.json'
import pt from './locales/pt.json'
import tr from './locales/tr.json'
import zh from './locales/zh.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
] as const

export const RTL_LANGUAGES = ['he']

function applyTextDirection(lang: string) {
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      pt: { translation: pt },
      zh: { translation: zh },
      ja: { translation: ja },
      de: { translation: de },
      tr: { translation: tr },
      he: { translation: he },
      it: { translation: it },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'pt', 'zh', 'ja', 'de', 'tr', 'he', 'it'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'stayfy_lang',
      caches: ['localStorage'],
    },
  })
  .then(() => applyTextDirection(i18n.language))

i18n.on('languageChanged', applyTextDirection)

export default i18n
