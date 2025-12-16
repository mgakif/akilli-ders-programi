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

  // ROBUST DELETE: Uses exact array indices to prevent day matching errors
  const handleDeleteCourseInstance = (scheduleIndex: number, courseIndex: number) => {
    if(!confirm("Bu dersi listeden kaldırmak istediğinize emin misiniz?")) return;

    const newSchedule = [...schedule];
    
    // Safety check
    if (scheduleIndex < 0 || scheduleIndex >= newSchedule.length) return;

    const targetDay = { ...newSchedule[scheduleIndex] };
    const newCourses = [...targetDay.courses];
    
    if (courseIndex >= 0 && courseIndex < newCourses.length) {
        newCourses.splice(courseIndex, 1);
        targetDay.courses = newCourses;

        // Update or remove the day if empty
        if (newCourses.length === 0) {
            newSchedule.splice(scheduleIndex, 1);
        } else {
            newSchedule[scheduleIndex] = targetDay;
        }

        setSchedule(newSchedule);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedule));
    }
  };

  // ROBUST GLOBAL DELETE: Trims strings to ensure matches
  const handleDeleteCourseGlobally = (courseName: string) => {
    // 1. Filter out the course from the schedule (Normalize names)
    const normalizedTarget = courseName.trim();

    const newSchedule = schedule.map(day => ({
        ...day,
        courses: day.courses.filter(c => c.name.trim() !== normalizedTarget)
    })).filter(day => day.courses.length > 0); // Remove days that become empty

    // 2. Remove from config
    const newConfig = { ...courseDayConfig };
    // Find keys that match strictly or trimmed
    Object.keys(newConfig).forEach(key => {
        if (key.trim() === normalizedTarget) {
            delete newConfig[key];
        }
    });

    // 3. Save states
    setSchedule(newSchedule);
    setCourseDayConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedule));
    localStorage.setItem(DAYS_CONFIG_KEY, JSON.stringify(newConfig));
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  // Aggregates recurring weekly courses AND specific dated courses for the current view
  const currentDayData = useMemo(() => {
    const dayName = getDayName(currentDate); 
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Store scheduleIndex instead of just day name for reliable deletion
    let combinedCourses: { course: Course, scheduleIndex: number, originalIndex: number }[] = [];

    // 1. Find Recurring Courses
    // Use findIndex to get the exact position in the master schedule array
    const recurringDayIndex = schedule.findIndex(s => !s.isDate && s.day.toLowerCase() === dayName.toLowerCase());
    
    if (recurringDayIndex !== -1) {
      schedule[recurringDayIndex].courses.forEach((c, idx) => {
        combinedCourses.push({ 
            course: c, 
            scheduleIndex: recurringDayIndex,
            originalIndex: idx 
        });
      });
    }

    // 2. Find Specific Date Courses
    const specificDayIndex = schedule.findIndex(s => s.isDate && s.day === dateStr);
    
    if (specificDayIndex !== -1) {
      schedule[specificDayIndex].courses.forEach((c, idx) => {
        combinedCourses.push({ 
            course: c, 
            scheduleIndex: specificDayIndex,
            originalIndex: idx 
        });
      });
    }

    // 3. Filter based on Day Configuration (User Settings)
    return combinedCourses.filter(item => {
        const configDays = courseDayConfig[item.course.name.trim()]; // Handle loose config
        
        // If no config exists for this course, show it by default
        if (!configDays) {
            // Check if there is a config for untrimmed version just in case
            const rawConfigDays = courseDayConfig[item.course.name];
            if (rawConfigDays) return rawConfigDays.includes(dayName);
            return true;
        }

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
                key={`${item.scheduleIndex}-${idx}`} 
                course={item.course} 
                onDelete={() => handleDeleteCourseInstance(item.scheduleIndex, item.original