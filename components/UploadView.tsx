import React, { useState } from 'react';
import { extractTextFromFile } from '../services/fileUtils';
import { parseScheduleWithGemini } from '../services/geminiService';
import { Schedule } from '../types';
import { UploadCloud, FileText, FileSpreadsheet, Loader2, ArrowLeft, AlertTriangle, HelpCircle, X, Copy, Check, Info, Wand2 } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

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
  
  // New States for Hints and Progress
  const [userHint, setUserHint] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setDebugLog(null);
    setProgress(5);
    setStatusMessage("Dosya okunuyor...");

    try {
      // 1. Extract text locally
      const text = await extractTextFromFile(file);
      setProgress(15);
      setStatusMessage("Yapay zeka analizi hazırlanıyor...");
      
      // 2. Send to Gemini with Progress Callback and Hints
      const schedule = await parseScheduleWithGemini(
        text, 
        (status, pct) => {
          setStatusMessage(status);
          setProgress(pct);
        },
        userHint // Pass the optional hint
      );
      
      // 3. Complete
      setStatusMessage("Tamamlandı!");
      setProgress(100);
      setTimeout(() => {
        onUploadSuccess(schedule);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Bir hata oluştu. Lütfen dosyanızın bozuk olmadığından emin olun.");
      setLoading(false);
      setProgress(0);
      
      const logContent = `
--- ERROR DETAILS ---
Time: ${new Date().toISOString()}
Message: ${err.message}
Details: ${err.details || 'N/A'}
Stack: ${err.stack}
      `.trim();
      setDebugLog(logContent);
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
          ? "Mevcut takvimine yeni bir ders planı ekleyerek birleştirebilirsin."
          : "Yıllık planınızı (.xlsx veya .docx) yükleyin, yapay zeka sizin için günleri ayarlasın."
        }
      </p>

      {/* Yapay Zeka İpucu Alanı */}
      <div className="w-full max-w-md mb-6 relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <Wand2 className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
        </div>
        <input 
          type="text" 
          value={userHint}
          onChange={(e) => setUserHint(e.target.value)}
          placeholder="Özel Talimat (Opsiyonel): Örn: Sadece 'Konu' sütununu al."
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm placeholder:text-slate-400"
          disabled={loading}
        />
        <div className="text-[10px] text-slate-400 text-left mt-1.5 ml-1">
          * AI'ya hangi sütunları okuması gerektiğini söyleyerek hataları azaltabilirsiniz.
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 max-w-md w-full relative animate-fade-in-up">
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
        <ProgressBar progress={progress} statusMessage={statusMessage} />
      ) : (
        <label className="relative cursor-pointer group animate-fade-in-up">
          <div className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1">
            <span className="font-semibold">Dosya Seç ve Başla</span>
          </div>
          <input 
            type="file" 
            accept=".xlsx,.xls,.docx" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>
      )}

      {!loading && (
        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs opacity-70 animate-fade-in">
          <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-xs font-medium text-slate-500">Excel (Önerilen)</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <FileText className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-xs font-medium text-slate-500">Word</span>
          </div>
        </div>
      )}

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