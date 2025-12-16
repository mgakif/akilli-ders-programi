import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

export const parseScheduleWithGemini = async (textData: string): Promise<Schedule> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key bulunamadı.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date();
  
  // Yıl tahmini için mantık: Eğer şu an 8. aydan sonraysak (Eylül-Aralık), eğitim yılı bu yıldır.
  // Değilse (Ocak-Haziran), eğitim yılı bir önceki yıl başlamıştır.
  const currentMonth = today.getMonth() + 1;
  const educationalStartYear = currentMonth >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  
  const dateContext = `
    REFERANS YIL BİLGİSİ: Bu ders programı ${educationalStartYear}-${educationalStartYear + 1} Eğitim-Öğretim yılına aittir. 
    - Eylül, Ekim, Kasım, Aralık ayları için YIL: ${educationalStartYear} olmalıdır.
    - Ocak, Şubat, Mart, Nisan, Mayıs, Haziran ayları için YIL: ${educationalStartYear + 1} olmalıdır.
    - JSON çıktısında "day" alanını oluştururken bu yılları KESİNLİKLE dikkate al. Rastgele yıl atama.
  `;
  
  const systemInstruction = `
    Sen uzman bir eğitim asistanısın. Excel veya Word dosyasından çıkarılmış ham metni analiz edip JSON formatına çevireceksin.

    ${dateContext}

    **ÖNEMLİ - DİKEY METİN VE TABLO YAPISI SORUNLARI İÇİN TALİMATLAR:**
    Word tablolarında Tarih/Hafta sütunu bazen DİKEY yazıldığı için metin çıktısında satırların hizası kayabilir.
    Bunu çözmek için şu mantığı uygula:
    1. **BLOK MANTIĞI (FILL-DOWN):** Metin akışında bir Tarih Aralığı (Örn: "11-15 Eylül") veya Hafta Bilgisi (Örn: "1. Hafta") gördüğünde, bunu bir "BAŞLIK" olarak kabul et.
    2. **UYGULAMA:** Bu tarihi, *yeni bir tarih/hafta ibaresi görene kadar* altında sıralanan tüm ders içeriklerine uygula. Yani her dersin yanına tarih yazılmamış olabilir, en son okuduğun tarihi kullanmaya devam et.
    3. **TARİH ÇIKARIMI:** Eğer "1. Hafta: 9-13 Eylül" yazıyorsa:
       - 9 Eylül ${educationalStartYear} -> Pazartesi
       - 10 Eylül ${educationalStartYear} -> Salı
       - ...şeklinde o haftanın iş günlerine dağıt.

    **AYRIŞTIRMA KURALLARI:**
    1. **KONULAR (topics):** "Konu", "Kazanım", "Alt Öğrenme Alanı", "Modül" başlıkları altındaki metinleri al.
    2. **GÖRMEZDEN GEL:** "YÖNTEM VE TEKNİKLER", "ARAÇ GEREÇLER", "ETKİNLİKLER" sütunlarını veri kirliliği yaratmaması için YOK SAY.
    3. **NOTLAR (note):** "Açıklamalar", "Belirli Gün ve Haftalar" sütununda yazan "Sınav", "Bayram", "Tatil", "Haftası" gibi ifadeleri "note" alanına ekle.

    **ÇIKTI FORMATI:**
    Sadece ve sadece saf JSON dizisi döndür. Markdown ('''json) kullanma.
  `;

  const prompt = `
    Aşağıdaki ders programı metnini analiz et.
    
    DİKKAT: Word dosyasından geldiği için "Tarih/Hafta" bilgisi metnin başında veya bloklar arasında tek başına duruyor olabilir. O tarihi, altındaki derslere dağıt.
    Yılları karıştırma. Eylül-Aralık: ${educationalStartYear}, Ocak-Haziran: ${educationalStartYear + 1}.

    Metin:
    ${textData.substring(0, 30000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "YYYY-MM-DD formatında tarih." },
              isDate: { type: Type.BOOLEAN, description: "Her zaman true olmalı." },
              courses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Dersin adı (Büyük harfle yazılmış olabilir)" },
                    time: { type: Type.STRING, description: "Ders saati süresi (örn: 4)", nullable: true },
                    topics: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "Kazanımlar ve Konular listesi."
                    },
                    note: { 
                      type: Type.STRING, 
                      nullable: true, 
                      description: "Sınav, Tatil, Belirli Gün ve Haftalar (Örn: '1. Sınav', 'Cumhuriyet Bayramı')." 
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    let jsonText = response.text;
    if (!jsonText) throw new Error("AI boş yanıt döndürdü.");

    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    
    try {
      const parsed = JSON.parse(jsonText);
      
      if (!Array.isArray(parsed)) {
         throw new Error("AI yanıtı beklenen formatta (dizi) değil.");
      }

      // Veri doğrulama ve temizleme (Sanitization)
      // Bu adım, courses dizisinin null/undefined olmasını engeller
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

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      throw new Error(`JSON formatı hatalı. AI Yanıtı: ${jsonText.substring(0, 200)}...`);
    }

  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    
    let errorMessage = error.message || "Dosya analiz edilemedi.";
    const detailedError = new Error(errorMessage);
    (detailedError as any).details = `
      Message: ${error.message}
      Stack: ${error.stack}
      AI Response: ${error.message.includes('AI Yanıtı') ? 'See message above' : 'Not available'}
    `;
    
    throw detailedError;
  }
};