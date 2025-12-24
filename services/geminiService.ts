
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Schedule, Course, DaySchedule } from "../types";
import { APP_CONFIG } from "./config";

const cleanJsonText = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
  const firstOpen = clean.indexOf('[');
  const lastClose = clean.lastIndexOf(']');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    clean = clean.substring(firstOpen, lastClose + 1);
  }
  return clean;
};

export interface GeminiInput {
    type: 'text' | 'image';
    data: string;
    mimeType?: string;
}

interface WeeklyPlan {
  startDate: string;
  courses: Course[];
}

export const parseScheduleWithGemini = async (
  input: GeminiInput, 
  onProgress?: (status: string, progress: number) => void,
  userInstruction?: string
): Promise<Schedule> => {
  const apiKey = APP_CONFIG.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key bulunamadı. Lütfen konfigürasyonu kontrol edin.");

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const educationalStartYear = currentMonth >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  const dateContext = `REFERANS EĞİTİM YILI: ${educationalStartYear} Eylül - ${educationalStartYear + 1} Haziran.`;

  if (onProgress) onProgress("Yapay zeka hazırlanıyor...", 10);

  const systemInstruction = `
    Sen uzman bir eğitim asistanısın. Görevin Yıllık Plan dosyasını analiz etmektir.
    KURALLAR:
    1. ${dateContext} yılını baz al.
    2. Haftalık tarihleri (Örn: 08-12 Eylül) PAZARTESİ gününe (YYYY-MM-DD) çevir.
    3. Ders adını, konusunu ve notları çıkar.
    ${userInstruction ? `KULLANICI EK NOTU: ${userInstruction}` : ''}
  `;

  const weeklySchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING },
        courses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
              note: { type: Type.STRING, nullable: true }
            },
            required: ["name", "topics"]
          }
        }
      },
      required: ["startDate", "courses"]
    }
  };

  try {
    let contentPart: any;
    if (input.type === 'image') {
        contentPart = { inlineData: { data: input.data, mimeType: input.mimeType || 'image/jpeg' } };
    } else {
        contentPart = { text: input.data.substring(0, 90000) };
    }

    if (onProgress) onProgress("Analiz ediliyor...", 60);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: { parts: [contentPart, { text: systemInstruction }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: weeklySchema,
        temperature: 0.1,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Yapay zeka yanıt veremedi.");

    const weeklyData: WeeklyPlan[] = JSON.parse(cleanJsonText(resultText));
    const expandedSchedule: Schedule = [];

    weeklyData.forEach(week => {
        if (!week.startDate) return;
        const monday = new Date(week.startDate);
        for (let i = 0; i < 5; i++) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            expandedSchedule.push({
                day: dayDate.toISOString().split('T')[0],
                isDate: true,
                courses: week.courses.map(c => ({ ...c, time: "" }))
            });
        }
    });

    expandedSchedule.sort((a, b) => a.day.localeCompare(b.day));
    if (onProgress) onProgress("Tamamlandı!", 100);
    return expandedSchedule;

  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Bağlantı hatası.");
  }
};
