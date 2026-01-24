import React from 'react';
import { Coffee, Github } from 'lucide-react';

interface SupportButtonProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export const SupportButton: React.FC<SupportButtonProps> = ({
  variant = 'floating',
  className = ''
}) => {
  const baseStyles = "group flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95";

  const floatingStyles = "fixed bottom-6 right-6 z-[9999] bg-[#FFDD00] text-black shadow-lg hover:shadow-xl";

  const inlineStyles = "glass-panel text-white border-teal-600/30 hover:border-teal-600/60 hover:bg-teal-600/10";

  const buttonStyles = variant === 'floating'
    ? `${baseStyles} ${floatingStyles}`
    : `${baseStyles} ${inlineStyles}`;

  return (
    <a
      href="https://buymeacoffee.com/dong0108"
      target="_blank"
      rel="noopener noreferrer"
      className={`${buttonStyles} ${className}`}
    >
      <Coffee
        className={`w-5 h-5 transition-transform group-hover:rotate-12 ${
          variant === 'floating' ? 'text-black' : 'text-teal-400'
        }`}
      />
      <span className="text-sm font-semibold">
        Support me
      </span>
      <span className="transition-transform group-hover:translate-x-1">
        →
      </span>
    </a>
  );
};

interface SourceCodeButtonProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export const SourceCodeButton: React.FC<SourceCodeButtonProps> = ({
  variant = 'inline',
  className = ''
}) => {
  const baseStyles = "group flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95";

  const floatingStyles = "fixed bottom-6 left-6 z-[9999] bg-gray-900 text-white shadow-lg hover:shadow-xl border border-gray-700";

  const inlineStyles = "glass-panel text-white border-blue-600/30 hover:border-blue-600/60 hover:bg-blue-600/10";

  const buttonStyles = variant === 'floating'
    ? `${baseStyles} ${floatingStyles}`
    : `${baseStyles} ${inlineStyles}`;

  return (
    <a
      href="https://github.com/UNKNOWNREM/WOS-manager"
      target="_blank"
      rel="noopener noreferrer"
      className={`${buttonStyles} ${className}`}
    >
      <Github
        className={`w-5 h-5 transition-transform group-hover:rotate-12 ${
          variant === 'floating' ? 'text-white' : 'text-blue-400'
        }`}
      />
      <span className="text-sm font-semibold">
        Source Code
      </span>
      <span className="transition-transform group-hover:translate-x-1">
        →
      </span>
    </a>
  );
};

export default SupportButton;
