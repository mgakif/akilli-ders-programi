import React from 'react';

interface ProgressBarProps {
  progress: number;
  statusMessage: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, statusMessage }) => {
  return (
    <div className="w-full max-w-md mx-auto mt-6 animate-fade-in">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-semibold text-indigo-900 transition-all duration-300">
          {statusMessage}
        </span>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          %{Math.min(100, Math.max(0, Math.round(progress)))}
        </span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 transition-all duration-500 ease-out rounded-full relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Büyük dosyalar parçalar halinde işlendiği için işlem biraz zaman alabilir. Lütfen bekleyiniz.
      </p>
    </div>
  );
};