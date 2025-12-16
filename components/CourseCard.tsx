import React from 'react';
import { Course } from '../types';
import { BookOpen, Clock, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onDelete?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4 hover:shadow-md transition-shadow duration-300 group">
      {/* Sınav veya Özel Not Alanı */}
      {course.note && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{course.note}</p>
        </div>
      )}

      <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span className="leading-tight">{course.name}</span>
          </h3>
          {course.time && (
            <span className="text-xs font-medium text-indigo-500 flex items-center gap-1 mt-1 ml-7">
              <Clock className="w-3 h-3" />
              {course.time}
            </span>
          )}
        </div>
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Dersi Sil"
            aria-label="Delete course"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Bugünün Konuları
        </h4>
        {course.topics.length > 0 ? (
          <ul className="space-y-2">
            {course.topics.map((topic, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{topic}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400 text-sm italic">Bu ders için konu belirtilmemiş.</p>
        )}
      </div>
    </div>
  );
};