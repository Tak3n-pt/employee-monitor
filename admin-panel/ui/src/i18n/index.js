/**
 * i18n Configuration
 * Multi-language support for the admin panel
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import de from './locales/de.json';
import zh from './locales/zh.json';

const resources = {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    de: { translation: de },
    zh: { translation: zh },
};

// Get saved language or detect from browser
const savedLanguage = localStorage.getItem('language');
const browserLanguage = navigator.language?.split('-')[0];
const defaultLanguage = savedLanguage || (resources[browserLanguage] ? browserLanguage : 'en');

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: defaultLanguage,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already handles XSS
        },
        react: {
            useSuspense: false,
        },
    });

// Update document direction for RTL languages
i18n.on('languageChanged', (lng) => {
    const rtlLanguages = ['ar', 'he', 'fa'];
    document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
    localStorage.setItem('language', lng);
});

// Set initial direction
const rtlLanguages = ['ar', 'he', 'fa'];
document.documentElement.dir = rtlLanguages.includes(defaultLanguage) ? 'rtl' : 'ltr';

export default i18n;

// Language options for UI
export const languageOptions = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
];
