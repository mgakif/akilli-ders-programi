export interface Course {
  name: string;
  time?: string;
  topics: string[];
  note?: string; // Sınav, etkinlik veya açıklama notları için
}

export interface DaySchedule {
  day: string; // "Pazartesi", "Salı" or "2023-10-27"
  isDate?: boolean; // True if 'day' is a specific date, false if it's a recurring weekday
  courses: Course[];
}

export type Schedule = DaySchedule[];

export type CourseDayConfig = Record<string, string[]>;

export enum ViewMode {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  UPLOAD = 'UPLOAD'
}