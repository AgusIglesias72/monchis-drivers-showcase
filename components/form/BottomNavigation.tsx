import React from 'react';
import { ClipboardList, DollarSign, Info } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'form' | 'info';
  onTabChange: (tab: 'form' | 'info') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-full p-1 shadow-2xl flex gap-1">
          <button
            onClick={() => onTabChange('form')}
            className={`
              flex-1 py-2.5 px-4 rounded-full flex items-center 
              justify-center gap-2 transition-all duration-300
              ${activeTab === 'form' ? 'bg-gray-300 text-gray-900 font-bold' : 'bg-white text-gray-600'}
            `}
          >
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm whitespace-nowrap flex-1">Formulario</span>
          </button>

          <button
            onClick={() => onTabChange('info')}
            className={`
              flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300
              ${activeTab === 'info' ? 'bg-gray-300 text-gray-900 font-bold' : 'bg-white text-gray-600'}
            `}
          >
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <Info className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm whitespace-nowrap flex-1">Información</span>
          </button>
        </div>
      </div>
  );
};