import React from 'react';
import Image from 'next/image';

const MONCHIS_RED = '#e7243f';

interface HeaderProps {
  currentStep?: number;
  totalSteps?: number;
  stepTitle?: string;
  showProgress?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentStep, 
  totalSteps, 
  stepTitle,
  showProgress = false 
}) => {
  const progress = currentStep && totalSteps ? ((currentStep / totalSteps) * 100) : 0;

  return (
    <>
      <div className="relative bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Image 
              src="/monchis-logo-white.png" 
              alt="Monchis" 
              width={140} 
              height={35}
              className="h-9 w-auto"
              priority
            />
            {showProgress && currentStep && totalSteps && (
              <div className="text-right">
                <p className="text-sm text-white/90 font-bold">Paso {currentStep} de {totalSteps}</p>
                {stepTitle && (
                  <p className="text-xs text-white/70">{stepTitle}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showProgress && currentStep && totalSteps && (
        <div className="relative max-w-2xl mx-auto px-4 mt-4">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full transition-all duration-500 ease-out bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
};