import React, { useState } from 'react';
import { extractTextFromFile } from '../services/fileUtils';
import { parseScheduleWithGemini } from '../services/geminiService';
import { Schedule } from '../types';
import { UploadCloud, FileText, FileSpreadsheet, Loader2, ArrowLeft, AlertTriangle, HelpCircle, X, Copy, Check, Info } from 'lucide-react';

interface UploadViewProps {
  onUploadSuccess: (schedule: Schedule) => void;
  hasExisting?: boolean;
  onCancel?: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUploadSuccess, hasExisting = false, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setDebugLog(null);

    try {
      // 1. Extract text locally
      const text = await extractTextFromFile(file);
      
      // 2. Send to Gemini
      const schedule = await parseScheduleWithGemini(text);
      
      // 3. Complete
      onUploadSuccess(schedule);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Bir hata oluştu. Lütfen dosyanızın bozuk olmadığından emin olun.");
      
      // Hata detaylarını log olarak sakla
      const logContent = `
--- ERROR DETAILS ---
Time: ${new Date().toISOString()}
Message: ${err.message}
Details: ${err.details || 'N/A'}
Stack: ${err.stack}
      `.trim();
      setDebugLog(logContent);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLog = () => {
    if (debugLog) {
      navigator.clipboard.writeText(debugLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in min-h-[60vh]">
      {hasExisting && onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-20 left-4 flex items-center gap-1 text-slate-500 hover:text-indigo-600 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
      )}

      <div className="bg-indigo-100 p-4 rounded-full mb-6">
        <UploadCloud className="w-12 h-12 text-indigo-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        {hasExisting ? "Yeni Ders Ekle" : "Ders Programını Yükle"}
      </h2>
      <p className="text-slate-500 mb-6 max-w-md">
        {hasExisting 
          ? "Başka bir dersin yıllık planını veya programını ekleyerek mevcut takviminle birleştirebilirsin."
          : "Excel (.xlsx) veya Word (.docx) formatındaki yıllık planınızı veya haftalık ders programınızı yükleyin."
        }
      </p>

      {/* İpucu Kutusu */}
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2 text-left max-w-md mb-8">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold mb-1">Dikey Metin Uyarısı:</p>
          Word dosyalarında "Tarih/Hafta" sütunu dikey yazılmışsa okuması zor olabilir. 
          Eğer Word dosyanız hatalı yüklenirse, tabloyu <strong>Excel'e kopyalayıp</strong> yüklemeyi deneyin. Excel yapıyı daha iyi korur.
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 max-w-md w-full relative">
          <div className="flex items-center justify-center gap-2 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>İşlem Başarısız</span>
          </div>
          <p>{error}</p>
          <p className="text-xs text-red-500 mt-2">
            İpucu: Dosyanızın "Konu/Kazanım" başlıklarını içerdiğinden emin olun.
          </p>
          
          {debugLog && (
            <button 
              onClick={() => setShowLog(true)}
              className="absolute top-2 right-2 p-1.5 hover:bg-red-100 rounded-full text-red-400 hover:text-red-700 transition-colors"
              title="Hata Detaylarını Göster (Log)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-indigo-600 font-medium">Yapay zeka dosyanızı analiz ediyor...</p>
        </div>
      ) : (
        <label className="relative cursor-pointer group">
          <div className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1">
            <span className="font-semibold">Dosya Seç</span>
          </div>
          <input 
            type="file" 
            accept=".xlsx,.xls,.docx" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs opacity-70">
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
          <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
          <span className="text-xs font-medium text-slate-500">Excel (Önerilen)</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-xs font-medium text-slate-500">Word</span>
        </div>
      </div>

      {/* Log Modal */}
      {showLog && debugLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Hata Kayıtları (Log)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyLog}
                  className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-600 flex items-center gap-1 text-xs font-medium"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
                <button onClick={() => setShowLog(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto bg-slate-900 text-slate-300 font-mono text-xs text-left">
              <pre className="whitespace-pre-wrap break-all">
                {debugLog}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};