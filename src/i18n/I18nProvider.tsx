import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 從 localStorage 讀取儲存的語言設置
    const saved = localStorage.getItem('wos_language') as Language | null;
    if (saved && ['zh-TW', 'zh-CN', 'en', 'ko'].includes(saved)) {
      return saved;
    }
    // 根據瀏覽器語言自動選擇
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return browserLang.includes('cn') ? 'zh-CN' : 'zh-TW';
    }
    if (browserLang.startsWith('ko')) return 'ko';
    return 'en'; // 默認英文
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wos_language', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations['zh-TW'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
