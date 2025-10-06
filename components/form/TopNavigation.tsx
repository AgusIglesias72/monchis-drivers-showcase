import React from 'react';
import { ClipboardList, Info } from 'lucide-react';

const MONCHIS_RED = '#e7243f';

interface TopNavigationProps {
  activeTab: 'form' | 'info';
  onTabChange: (tab: 'form' | 'info') => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="relative backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="bg-white/20 rounded-full p-1 flex gap-1">
          <button
            onClick={() => onTabChange('form')}
            className={`
              flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300
              ${activeTab === 'form' ? 'bg-white text-gray-900 font-bold' : 'text-white'}
            `}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm">Formulario</span>
          </button>

          <button
            onClick={() => onTabChange('info')}
            className={`
              flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300
              ${activeTab === 'info' ? 'bg-white text-gray-900 font-bold' : 'text-white'}
            `}
          >
            <Info className="w-4 h-4" />
            <span className="text-sm">Información</span>
          </button>
        </div>
      </div>
    </div>
  );
};