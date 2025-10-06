import React from 'react';
import Image from 'next/image';

const MONCHIS_RED = '#e7243f';

export const LoadingScreen: React.FC = () => {
  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: MONCHIS_RED }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/15 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <div 
        className="relative z-10 animate-in slide-in-from-bottom duration-700"
        style={{
          animation: 'slideInFromBottom 700ms ease-out, fadeOut 1500ms ease-out 1500ms forwards'
        }}
      >
        <div className="relative w-32 h-32 mx-auto mb-4">
          <Image 
            src="/monchis-short-white.png" 
            alt="Monchis" 
            width={128} 
            height={128}
            className="animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            filter: blur(0px);
          }
          to {
            opacity: 0;
            filter: blur(10px);
          }
        }
      `}</style>
    </div>
  );
};