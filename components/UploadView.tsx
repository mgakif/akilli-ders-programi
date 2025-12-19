import React, { useState } from 'react';
import { extractTextFromFile, fileToBase64 } from '../services/fileUtils';
import { parseScheduleWithGemini, GeminiInput } from '../services/geminiService';
import { Schedule } from '../types';
import { UploadCloud, FileText, FileSpreadsheet, ArrowLeft, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface UploadViewProps {
  onUploadSuccess: (schedule: Schedule) => void;
  hasExisting?: boolean;
  onCancel?: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUploadSuccess, hasExisting = false, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(5);
    setStatusMessage("Dosya türü algılanıyor...");

    try {
        let input: GeminiInput;

        if (file.type.startsWith('image/')) {
            setStatusMessage("Resim işleniyor...");
            const base64 = await fileToBase64(file);
            input = {
                type: 'image',
                data: base64,
                mimeType: file.type
            };
        } else {
            setStatusMessage("Metin çıkartılıyor...");
            const text = await extractTextFromFile(file);
            input = {
                type: 'text',
                data: text
            };
        }

        const schedule = await parseScheduleWithGemini(
            input,
            (status, pct) => {
                setStatusMessage(status);
                setProgress(pct);
            }
        );

        setStatusMessage("Tamamlandı!");
        setProgress(100);
        setTimeout(() => {
            onUploadSuccess(schedule);
        }, 500);

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Dosya işlenirken bir hata oluştu.");
        setLoading(false);
        setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in min-h-[60vh]">
      {hasExisting && onCancel && !loading && (
        <button 
          onClick={onCancel}
          className="absolute top-20 left-4 flex items-center gap-1 text-slate-500 hover:text-indigo-600 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
      )}

      {loading ? (
        <ProgressBar progress={progress} statusMessage={statusMessage} />
      ) : (
        <>
            <div className={`
                w-full max-w-lg p-10 rounded-3xl border-2 border-dashed transition-all duration-300
                ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-slate-200 bg-white'}
                ${error ? 'border-red-200 bg-red-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            >
                <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <UploadCloud className="w-10 h-10 text-indigo-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Dosyanızı Buraya Bırakın
                </h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                    Excel tablosu, Word dosyası veya ders programının <b>ekran görüntüsü/resmi</b>.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-white/50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2 text-left">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <label className="relative cursor-pointer group inline-block">
                    <div className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform group-hover:-translate-y-1 font-semibold">
                        Dosya Seç
                    </div>
                    <input 
                        type="file" 
                        accept=".xlsx,.xls,.docx,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />
                </label>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <ImageIcon className="w-6 h-6 text-purple-500 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Resim / Ekran Görüntüsü</span>
                    <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded mt-1 font-bold">En Kolayı</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <FileSpreadsheet className="w-6 h-6 text-green-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Excel Dosyası</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <FileText className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Word Dosyası</span>
                </div>
            </div>
        </>
      )}
    </div>
  );
};