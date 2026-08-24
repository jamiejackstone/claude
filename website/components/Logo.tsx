
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'light' for dark backgrounds (navbar), 'dark' for light backgrounds
}

/**
 * THE HOOP HEROES LOGO COMPONENT
 */
const LOGO_URL = "https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6929cb514a68807a3d781c96.png";

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'light' }) => {
  if (LOGO_URL) {
    return (
      <img 
        src={LOGO_URL} 
        alt="Hoop Heroes Logo" 
        width="150"
        height="60"
        className={`h-14 md:h-20 w-auto object-contain ${className}`} 
      />
    );
  }

  // Fallback: Stylized Text Logo
  return (
    <div className={`flex flex-col leading-none select-none ${className}`}>
      <span className={`font-display text-2xl md:text-3xl uppercase tracking-wide transition-transform ${variant === 'light' ? 'text-white' : 'text-brand-dark'}`}>
        Hoop<span className="text-brand-orange">Heroes</span>
      </span>
      <span className={`text-[0.6rem] md:text-xs font-bold uppercase tracking-[0.2em] ${variant === 'light' ? 'text-slate-300' : 'text-slate-500'}`}>
        Youth Basketball
      </span>
    </div>
  );
};
