import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const languages = [
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '簡體中文' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      <Globe size={18} className="text-slate-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 transition cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
