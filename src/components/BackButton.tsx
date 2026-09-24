import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#eeece6] bg-white text-xs font-semibold text-[#6e6b66] hover:text-[#1a1918] hover:border-[#d4d0c8] hover:bg-[#faf9f6] transition-all cursor-pointer shadow-xs active:scale-98 ${className}`}
      title={label}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
};
