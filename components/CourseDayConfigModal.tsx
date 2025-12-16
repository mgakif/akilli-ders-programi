import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Save, Check } from 'lucide-react';
import { Schedule, CourseDayConfig } from '../types';

interface CourseDayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
  currentConfig: CourseDayConfig;
  onSave: (config: CourseDayConfig) => void;
}

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const SHORT_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export const CourseDayConfigModal: React.FC<CourseDayConfigModalProps> = ({
  isOpen,
  onClose,
  schedule,
  currentConfig,
  onSave
}) => {
  const [tempConfig, setTempConfig] = useState<CourseDayConfig>({});
  const [uniqueCourses, setUniqueCourses] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Extract unique course names
      const courses = new Set<string>();
      schedule.forEach(day => {
        day.courses.forEach(c => {
            if(c.name && c.name.trim() !== "") {
                courses.add(c.name.trim());
            }
        });
      });
      setUniqueCourses(Array.from(courses).sort());
      setTempConfig({ ...currentConfig });
    }
  }, [isOpen, schedule, currentConfig]);

  if (!isOpen) return null;

  const toggleDay = (courseName: string, day: string) => {
    setTempConfig(prev => {
      const currentDays = prev[courseName] || [];
      
      // If day exists, remove it
      if (currentDays.includes(day)) {
        const newDays = currentDays.filter(d => d !== day);
        // If array becomes empty, we might want to remove the key or keep it empty (implying no days)
        // Let's keep it empty to mean "Hidden on all days"
        return { ...prev, [courseName]: newDays };
      } 
      // If day doesn't exist, add it
      else {
        return { ...prev, [courseName]: [...currentDays, day] };
      }
    });
  };

  const isDaySelected = (courseName: string, day: string) => {
    // If no config exists for this course, default to TRUE (show on all days) 
    // BUT we want to force user to select.
    // Logic: If key exists in config, follow config. If not, assume it shows on all days (default behavior of app).
    // To make UI intuitive: If key is missing, show all selected.
    
    if (tempConfig[courseName] === undefined) return true;
    return tempConfig[courseName].includes(day);
  };

  const handleSave = () => {
    onSave(tempConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <div className="flex items-center gap-2 text-indigo-900">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <CalendarClock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <h3 className="font-bold text-lg leading-tight">Ders Günlerini Düzenle</h3>
                <p className="text-xs text-indigo-600/80">Hangi dersin hangi gün gösterileceğini seçin.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-6 h-6 text-indigo-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {uniqueCourses.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
                Listelenecek ders bulunamadı. Önce bir ders programı yükleyin.
            </div>
          ) : (
            <div className="space-y-4">
               {uniqueCourses.map((courseName) => (
                 <div key={courseName} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h4 className="font-semibold text-slate-800 text-sm sm:text-base">{courseName}</h4>
                        <div className="flex gap-1">
                            {DAYS.slice(0, 5).map((day, idx) => { // Only Mon-Fri usually relevant for schools
                                const isSelected = isDaySelected(courseName, day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(courseName, day)}
                                        className={`
                                            w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                                            ${isSelected 
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-100' 
                                                : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                                            }
                                        `}
                                        title={day}
                                    >
                                        {SHORT_DAYS[idx]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
            >
                İptal
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                Kaydet
            </button>
        </div>
      </div>
    </div>
  );
};