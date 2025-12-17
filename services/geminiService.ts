import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

// Helper function to safely retrieve API Key
const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
  } catch (e) {}
  try {
    // @ts-ignore
    if (import.meta?.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    // @ts-ignore
    if (import.meta?.env?.API_KEY) return import.meta.env.API_KEY;
  } catch (e) {}
  return undefined;
};

// Robust JSON parser with array recovery
const safeJSONParse = (jsonString: string): any => {
  let cleaned = jsonString.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON parse failed, attempting recovery...", e);
    if (cleaned.startsWith('[')) {
       let currentString = cleaned;
       for (let i = 0; i < 5; i++) {
          const lastBraceIndex = currentString.lastIndexOf('}');
          if (lastBraceIndex === -1) break;
          currentString = currentString.substring(0, lastBraceIndex + 1);
          const candidate = currentString + ']';
          try {
             return JSON.parse(candidate);
          } catch (retryError) {
             currentString = currentString.substring(0, lastBraceIndex);
          }
       }
    }
    throw new Error(`JSON formatı bozuk: ${(e as any).message}`);
  }
};

// Aggressive text cleaner to reduce Input Token usage
const preprocessText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')       // Normalize newlines
    .replace(/\t/g, ' ')          // Tabs to spaces
    .replace(/ {2,}/g, ' ')       // Collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')   // Max 2 empty lines
    .trim();
};

export const parseScheduleWithGemini = async (
  textData: string, 
  onProgress?: (status: string, progress: number) => void,
  userInstruction?: string
): Promise<Schedule> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key bulunamadı. Vercel ortam değişkenlerini (VITE_API_KEY) kontrol edin.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const today = new Date();
  
  // Yıl tahmini
  const currentMonth = today.getMonth() + 1;
  const educationalStartYear = currentMonth >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  const dateContext = `REF YIL: ${educationalStartYear}-${educationalStartYear + 1}.`;

  // Base System Instruction
  const systemInstruction = `
    Sen bir eğitim asistanısın. Metni JSON dizisine çevir.
    ${dateContext}
    
    ${userInstruction ? `**ÖZEL İSTEK:** ${userInstruction}` : ''}

    **KURALLAR:**
    1. Sadece ders verilerini al. (Yöntem, Araç vb. SİL).
    2. Tarih bloklarını (Örn: "10-14 Eylül") haftanın günlerine dağıt.
    3. JSON döndür. Markdown yok.
    4. Çıktı çok uzun olmasın diye açıklamaları özetle.
  `;

  // Pre-process and Limit
  // 60,000 chars is approx 15k-20k tokens. Safe for Flash model input.
  // We take the substring to prevent massive bills on accidental huge file uploads.
  const cleanedText = preprocessText(textData).substring(0, 60000); 

  if (onProgress) onProgress("Veri optimize ediliyor ve gönderiliyor...", 20);

  const prompt = `
    Ders programını analiz et.
    Metin:
    ${cleanedText}
  `;

  try {
    if (onProgress) onProgress("Yapay zeka analiz ediyor... (Bu işlem dosya boyutuna göre 10-30sn sürebilir)", 50);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "YYYY-MM-DD" },
              isDate: { type: Type.BOOLEAN },
              courses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    time: { type: Type.STRING, nullable: true },
                    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    note: { type: Type.STRING, nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (onProgress) onProgress("Yanıt işleniyor...", 90);

    const jsonText = response.text;
    if (!jsonText) throw new Error("AI yanıt döndürmedi.");

    const parsed = safeJSONParse(jsonText);
    
    if (!Array.isArray(parsed)) {
         throw new Error("AI yanıtı beklenen formatta (dizi) değil.");
    }

    if (onProgress) onProgress("Tamamlandı!", 100);

    const validatedSchedule: Schedule = parsed.map((item: any) => ({
        day: item.day ? String(item.day) : "Tarihsiz",
        isDate: !!item.isDate,
        courses: Array.isArray(item.courses) ? item.courses.map((c: any) => ({
            name: c.name ? String(c.name) : "Ders",
            time: c.time ? String(c.time) : undefined,
            topics: Array.isArray(c.topics) ? c.topics.map(String) : [],
            note: c.note ? String(c.note) : undefined
        })) : []
    }));

    return validatedSchedule;

  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    
    let errorMessage = error.message || "Dosya analiz edilemedi.";
    const detailedError = new Error(errorMessage);
    (detailedError as any).details = `
      Message: ${error.message}
      AI Response Snippet: ${error.message.includes('AI Yanıtı') ? 'See above' : 'Not available'}
    `;
    
    throw detailedError;
  }
};