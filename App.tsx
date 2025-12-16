import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, Schedule, Course, CourseDayConfig } from './types';
import { UploadView } from './components/UploadView';
import { CourseCard } from './components/CourseCard';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { CourseDayConfigModal } from './components/CourseDayConfigModal';
import { Calendar, Layout, Plus, ChevronLeft, ChevronRight, LogOut, Settings, CalendarClock } from 'lucide-react';

const STORAGE_KEY = 'my_smart_schedule_v1';
const AUTH_KEY = 'my_smart_schedule_auth_v1';
const DAYS_CONFIG_KEY = 'my_smart_schedule_days_v1';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.UPLOAD);
  const [schedule, setSchedule] = useState<Schedule>([]);
  const [courseDayConfig, setCourseDayConfig] = useState<CourseDayConfig>({});
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDayConfigOpen, setIsDayConfigOpen] = useState(false);
  
  // Load initial state
  useEffect(() => {
    // Check Auth
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth === 'true') {
      setIsAuthenticated(true);
    }

    // Load Schedule
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSchedule(parsed);
          setViewMode(ViewMode.TODAY);
        }
      } catch (e) {
        console.error("Failed to parse saved schedule", e);
      }
    }

    // Load Day Config
    const savedConfig = localStorage.getItem(DAYS_CONFIG_KEY);
    if (savedConfig) {
        try {
            setCourseDayConfig(JSON.parse(savedConfig));
        } catch (e) {
            console.error("Failed to parse day config", e);
        }
    }
  }, []);

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
  };

  const handleUploadSuccess = (incomingSchedule: Schedule) => {
    // Check if incomingSchedule is array
    if (!Array.isArray(incomingSchedule)) {
        console.error("Uploaded data is not an array");
        return;
    }

    // Merge Strategy:
    const mergedSchedule = [...schedule];

    incomingSchedule.forEach(incomingDay => {
      // Defensive coding: ensure courses is an array
      const safeCourses = Array.isArray(incomingDay.courses) ? incomingDay.courses : [];
      
      const existingDayIndex = mergedSchedule.findIndex(s => s.day === incomingDay.day && s.isDate === incomingDay.isDate);
      
      if (existingDayIndex > -1) {
        mergedSchedule[existingDayIndex] = {
          ...mergedSchedule[existingDayIndex],
          courses: [...mergedSchedule[existingDayIndex].courses, ...safeCourses]
        };
      } else {
        // Create new entry ensuring courses is set
        mergedSchedule.push({
            ...incomingDay,
            courses: safeCourses
        });
      }
    });

    setSchedule(mergedSchedule);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSchedule));
    setViewMode(ViewMode.TODAY);
  };

  const handleImportData = (importedSchedule: Schedule, importedConfig?: CourseDayConfig) => {
    setSchedule(importedSchedule);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(importedSchedule));
    
    if (importedConfig) {
      setCourseDayConfig(importedConfig);
      localStorage.setItem(DAYS_CONFIG_KEY, JSON.stringify(importedConfig));
    }
    
    setViewMode(ViewMode.TODAY);
  };

  const handleClearAll = () => {
    if(confirm("Tüm ders programını silmek istediğinize emin misiniz?")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DAYS_CONFIG_KEY);
      setSchedule([]);
      setCourseDayConfig({});
      setViewMode(ViewMode.UPLOAD);
      setIsSettingsOpen(false);
    }
  };

  const handleSaveDayConfig = (newConfig: CourseDayConfig) => {
      setCourseDayConfig(newConfig);
      localStorage.setItem(DAYS_CONFIG_KEY, JSON.stringify(newConfig));
  };

  const handleDeleteCourse = (day: string, isDate: boolean, courseIndex: number) => {
    if(!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;

    let found = false;
    const newSchedule = schedule.map(daySchedule => {
      // Logic: Only update the FIRST matching day.
      // This prevents issues if duplicate days exist in the schedule array.
      if (!found && daySchedule.day === day && !!daySchedule.isDate === isDate) {
        found = true;
        const currentCourses = Array.isArray(daySchedule.courses) ? daySchedule.courses : [];
        const newCourses = [...currentCourses];
        
        if (courseIndex >= 0 && courseIndex < newCourses.length) {
            newCourses.splice(courseIndex, 1);
        }
        
        return { ...daySchedule, courses: newCourses };
      }
      return daySchedule;
    }).filter(daySchedule => Array.isArray(daySchedule.courses) && daySchedule.courses.length > 0); // Remove day if empty

    setSchedule(newSchedule);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedule));
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  // Aggregates recurring weekly courses AND specific dated courses for the current view
  const currentDayData = useMemo(() => {
    const dayName = getDayName(currentDate); 
    const dateStr = currentDate.toISOString().split('T')[0];
    
    let combinedCourses: { course: Course, originalDayKey: string, isDate: boolean, originalIndex: number }[] = [];

    // 1. Find Recurring Courses
    const recurringDay = schedule.find(s => !s.isDate && s.day.toLowerCase() === dayName.toLowerCase());
    if (recurringDay) {
      recurringDay.courses.forEach((c, idx) => {
        combinedCourses.push({ 
            course: c, 
            originalDayKey: recurringDay.day, 
            isDate: false, 
            originalIndex: idx 
        });
      });
    }

    // 2. Find Specific Date Courses
    const specificDay = schedule.find(s => s.isDate && s.day === dateStr);
    if (specificDay) {
      specificDay.courses.forEach((c, idx) => {
        combinedCourses.push({ 
            course: c, 
            originalDayKey: specificDay.day, 
            isDate: true, 
            originalIndex: idx 
        });
      });
    }

    // 3. Filter based on Day Configuration (User Settings)
    // If user said "Programming" is only on "Wednesday", and today is "Monday", hide it.
    return combinedCourses.filter(item => {
        const configDays = courseDayConfig[item.course.name];
        
        // If no config exists for this course, show it by default
        if (!configDays) return true;

        // If config exists, check if today matches one of the selected days
        return configDays.includes(dayName);
    });

  }, [schedule, currentDate, courseDayConfig]);

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const resetToToday = () => setCurrentDate(new Date());

  const renderHeader = () => (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode(ViewMode.TODAY)}>
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-bold text-slate-800 text-lg tracking-tight hidden xs:block">Ders Programım</h1>
      </div>
      <div className="flex items-center gap-2">
        {schedule.length > 0 && (
          <>
             <button 
                onClick={() => setIsDayConfigOpen(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                title="Ders Günlerini Ayarla"
            >
                <CalendarClock className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode(ViewMode.UPLOAD)} 
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ders Ekle</span>
            </button>
          </>
        )}
        
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Ayarlar / Yedekle"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Çıkış Yap"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );

  const renderNav = () => (
    <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 select-none">
      <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95">
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      
      <div className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity" onClick={resetToToday}>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">
          {currentDate.toDateString() === new Date().toDateString() ? "Bugün" : currentDate.toLocaleDateString('tr-TR')}
        </span>
        <span className="text-lg font-bold text-slate-800">
          {getDayName(currentDate)}
        </span>
      </div>

      <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95">
        <ChevronRight className="w-5 h-5 text-slate-600" />
      </button>
    </div>
  );

  const renderContent = () => {
    if (viewMode === ViewMode.UPLOAD) {
      return (
        <UploadView 
          onUploadSuccess={handleUploadSuccess} 
          hasExisting={schedule.length > 0} 
          onCancel={() => setViewMode(ViewMode.TODAY)}
        />
      );
    }

    return (
      <div className="max-w-md mx-auto w-full px-4 pt-6 pb-24">
        {renderNav()}

        <div className="animate-fade-in-up">
          <div className="flex items-baseline justify-between mb-4 px-1">
            <h2 className="text-xl font-bold text-slate-800">Dersler</h2>
            <span className="text-sm font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              {currentDayData.length} Ders
            </span>
          </div>
          
          {currentDayData.length > 0 ? (
            currentDayData.map((item, idx) => (
              <CourseCard 
                key={`${item.originalDayKey}-${idx}`} 
                course={item.course} 
                onDelete={() => handleDeleteCourse(item.originalDayKey, item.isDate, item.originalIndex)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm border-dashed">
              <Layout className="w-12 h-12 text-slate-200 mb-3" />
              <h3 className="text-lg font-medium text-slate-700">Ders Bulunamadı</h3>
              <p className="text-slate-400 text-sm max-w-[240px] text-center mt-1">
                Bu gün için planlanmış veya ayarlanmış bir ders görünmüyor.
              </p>
              
              <div className="flex gap-2 mt-4">
                 <button 
                    onClick={() => setIsDayConfigOpen(true)}
                    className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:underline bg-indigo-50 px-3 py-2 rounded-lg"
                 >
                    <CalendarClock className="w-4 h-4" />
                    Günleri Düzenle
                 </button>
                 <button 
                    onClick={() => setViewMode(ViewMode.UPLOAD)} 
                    className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:underline bg-indigo-50 px-3 py-2 rounded-lg"
                 >
                    <Plus className="w-4 h-4" />
                    Ders Ekle
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {renderHeader()}
      <main className="w-full">
        {renderContent()}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        schedule={schedule}
        courseDayConfig={courseDayConfig}
        onImport={handleImportData}
        onClear={handleClearAll}
      />

      <CourseDayConfigModal
        isOpen={isDayConfigOpen}
        onClose={() => setIsDayConfigOpen(false)}
        schedule={schedule}
        currentConfig={courseDayConfig}
        onSave={handleSaveDayConfig}
      />
    </div>
  );
}