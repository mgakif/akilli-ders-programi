
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Schedule, Course, DaySchedule } from "../types";

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  
  return '';
};

const getApiKey = (): string | undefined => {
  const key = getEnv('API_KEY') || getEnv('VITE_API_KEY');
  return key || undefined;
};

const cleanJsonText = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  
  // Remove markdown code blocks
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

  // Extract array if embedded in text
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

// Intermediate interface for AI output
interface WeeklyPlan {
  startDate: string; // YYYY-MM-DD (Monday)
  courses: Course[];
}

export const parseScheduleWithGemini = async (
  input: GeminiInput, 
  onProgress?: (status: string, progress: number) => void,
  userInstruction?: string
): Promise<Schedule> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key bulunamadı.");

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const today = new Date();
  
  const currentMonth = today.getMonth() + 1;
  // If we are in Aug-Dec, start year is this year. If Jan-July, start year is last year.
  const educationalStartYear = currentMonth >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  const dateContext = `REFERANS EĞİTİM YILI: ${educationalStartYear} Eylül - ${educationalStartYear + 1} Haziran.`;

  if (onProgress) onProgress("Yapay zeka hazırlanıyor...", 10);

  const systemInstruction = `
    Sen uzman bir eğitim asistanısın. Görevin Yıllık Plan dosyasını analiz etmektir.
    
    KURALLAR:
    1. ${dateContext} yılını baz al.
    2. Verilen tabloda her satır genellikle bir haftayı temsil eder (Örn: "1. Hafta: 08-12 Eylül").
    3. Her satır için o haftanın **PAZARTESİ** gününün tarihini hesapla (YYYY-MM-DD formatında).
    4. Dersin adını, konusunu (topics) ve varsa notları/belirli günleri çıkar.
    5. "topics" (Konu/Kazanım) alanını eksiksiz doldur.
    
    ${userInstruction ? `KULLANICI EK NOTU: ${userInstruction}` : ''}
  `;

  // We ask for Weekly data instead of Daily data to save output tokens (approx 5x more efficient)
  const weeklySchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        startDate: { 
          type: Type.STRING, 
          description: "The date of the Monday of this week in YYYY-MM-DD format." 
        },
        courses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Course name" },
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
        if (onProgress) onProgress("Görsel taranıyor...", 30);
        contentPart = {
            inlineData: {
                data: input.data,
                mimeType: input.mimeType || 'image/jpeg'
            }
        };
    } else {
        if (onProgress) onProgress("Tablo analiz ediliyor...", 30);
        contentPart = {
            text: input.data.substring(0, 90000) // Safe limit
        };
    }

    if (onProgress) onProgress("Program analiz ediliyor...", 60);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: {
          parts: [contentPart, { text: systemInstruction }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: weeklySchema,
        maxOutputTokens: 8192, // Still use max, but now it fits easily
        temperature: 0.1,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    if (onProgress) onProgress("Veriler işleniyor...", 85);

    const resultText = response.text;
    if (!resultText) throw new Error("Yapay zeka yanıt veremedi.");

    try {
        const cleanedText = cleanJsonText(resultText);
        const weeklyData: WeeklyPlan[] = JSON.parse(cleanedText);
        
        if (!Array.isArray(weeklyData)) throw new Error("Format hatası.");

        // EXPAND WEEKLY DATA TO DAILY SCHEDULE (Client-Side)
        const expandedSchedule: Schedule = [];

        weeklyData.forEach(week => {
            if (!week.startDate || !week.courses) return;
            
            // Parse Monday
            const monday = new Date(week.startDate);
            if (isNaN(monday.getTime())) return;

            // Generate Mon, Tue, Wed, Thu, Fri for this week
            for (let i = 0; i < 5; i++) {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dateStr = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD

                expandedSchedule.push({
                    day: dateStr,
                    isDate: true,
                    courses: week.courses.map(c => ({
                        name: c.name || "Ders",
                        topics: c.topics || [],
                        note: c.note,
                        time: "" // Time is usually not in annual plans
                    }))
                });
            }
        });

        // Sort by date
        expandedSchedule.sort((a, b) => a.day.localeCompare(b.day));

        if (onProgress) onProgress("Tamamlandı!", 100);
        return expandedSchedule;

    } catch (parseError) {
        console.error("Processing Error:", parseError);
        console.log("Raw:", resultText);
        throw new Error("Veri işleme hatası. Dosya yapısı çok karmaşık olabilir.");
    }

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("SAFETY")) throw new Error("Güvenlik filtresi.");
    throw new Error(error.message || "Bağlantı hatası.");
  }
};
