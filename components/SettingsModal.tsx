import React, { useRef, useState } from 'react';
import { X, Download, Upload, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Schedule, CourseDayConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
  courseDayConfig: CourseDayConfig;
  onImport: (data: Schedule, config?: CourseDayConfig) => void;
  onClear: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  schedule, 
  courseDayConfig,
  onImport,
  onClear
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleExport = () => {
    // Yeni format: Hem dersleri hem de ayarları içeren bir obje
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      schedule: schedule,
      courseDayConfig: courseDayConfig
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ders_programi_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        // Format Kontrolü
        if (Array.isArray(parsed)) {
          // Eski format (Sadece Schedule array'i)
          onImport(parsed, {});
        } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
          // Yeni format (Obje içinde schedule ve config)
          onImport(parsed.schedule, parsed.courseDayConfig || {});
        } else {
          throw new Error("Geçersiz format");
        }
        
        setImportStatus('success');
        setTimeout(() => {
            setImportStatus('idle');
            onClose();
        }, 1000);
      } catch (err) {
        console.error(err);
        setImportStatus('error');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Veri Yönetimi</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Yedekle (Export)</h4>
            <p className="text-xs text-slate-500">
              Mevcut ders programını ve gün ayarlarını bir dosya olarak indir. Bu dosyayı başka bir cihazda kullanabilirsin.
            </p>
            <button 
              onClick={handleExport}
              disabled={schedule.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download className="w-4 h-4" />
              Verileri İndir (.json)
            </button>
          </div>

          <div className="h-px bg-slate-100 w-full"></div>

          {/* Import Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Geri Yükle (Import)</h4>
            <p className="text-xs text-slate-500">
              Daha önce indirdiğin bir yedek dosyasını yükle. Mevcut verilerin üzerine yazılacaktır.
            </p>
            
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".json" 
              className="hidden" 
              onChange={handleFileChange}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium border ${
                importStatus === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-600' 
                  : importStatus === 'success'
                  ? 'bg-green-50 border-green-200 text-green-600'
                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
              }`}
            >
               {importStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
               {importStatus === 'success' && <Check className="w-4 h-4" />}
               {importStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
               
               {importStatus === 'idle' && <><Upload className="w-4 h-4" /> Yedek Dosyası Seç</>}
               {importStatus === 'loading' && "Yükleniyor..."}
               {importStatus === 'success' && "Başarıyla Yüklendi!"}
               {importStatus === 'error' && "Hatalı Dosya Formatı"}
            </button>
          </div>
          
          <div className="h-px bg-slate-100 w-full"></div>

           {/* Danger Zone */}
           <div className="pt-2">
            <button 
              onClick={onClear}
              className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 mx-auto"
            >
              <AlertTriangle className="w-3 h-3" />
              Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};