import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// 根据地区/语言代码返回默认语言
const getDefaultLanguage = (): Language => {
  // 首先检查 localStorage 中的保存设置
  const saved = localStorage.getItem('wos_language') as Language | null;
  if (saved && ['zh-TW', 'zh-CN', 'en', 'ko'].includes(saved)) {
    return saved;
  }

  // 获取浏览器语言和地区
  const browserLang = navigator.language.toLowerCase();
  const locale = navigator.locale?.toLowerCase() || browserLang;
  
  // 根据浏览器语言和地区返回相应的默认语言
  // 格式: language-COUNTRY，例如 zh-TW (台湾), zh-CN (中国), ko-KR (韩国)
  
  // 中文检查 - 根据地区区分繁简体
  if (browserLang.startsWith('zh')) {
    // 台湾 - 繁体中文
    if (locale.includes('tw') || locale.includes('zh-tw')) {
      return 'zh-TW';
    }
    // 中国/马来西亚 - 简体中文
    if (locale.includes('cn') || locale.includes('zh-cn') || locale.includes('my')) {
      return 'zh-CN';
    }
    // 默认中文使用繁体
    return 'zh-TW';
  }
  
  // 韩文
  if (browserLang.startsWith('ko') || locale.includes('kr')) {
    return 'ko';
  }
  
  // 其他语言使用英文
  return 'en';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return getDefaultLanguage();
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
