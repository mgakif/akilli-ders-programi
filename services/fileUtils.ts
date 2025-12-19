// Access global libraries loaded via CDN in index.html
// We access them lazily inside functions to ensure they are loaded

export interface RawExcelData {
  headers: string[];
  rows: any[][];
}

const getXLSX = () => {
  const xlsx = (window as any).XLSX;
  if (!xlsx) {
    throw new Error("Excel kütüphanesi (XLSX) yüklenemedi. Lütfen sayfayı yenileyin veya internet bağlantınızı kontrol edin.");
  }
  return xlsx;
};

const getMammoth = () => {
  const mammoth = (window as any).mammoth;
  if (!mammoth) {
    throw new Error("Word kütüphanesi (Mammoth) yüklenemedi. Lütfen sayfayı yenileyin.");
  }
  return mammoth;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:image/png;base64," part
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    return extractTextFromExcelAsMarkdown(file);
  } else if (extension === 'docx') {
    return extractTextFromWord(file);
  } else {
    throw new Error("Desteklenmeyen dosya formatı.");
  }
};

// Converts Excel directly to a Markdown table string which Gemini understands perfectly
const extractTextFromExcelAsMarkdown = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const XLSX = getXLSX();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (!e.target?.result) throw new Error("Dosya içeriği boş.");
          
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Get array of arrays
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          if (!rows || rows.length === 0) {
              throw new Error("Excel boş görünüyor.");
          }

          // Convert to Markdown Table format
          // This preserves the visual structure for the AI
          let markdown = `Tablo Adı: ${sheetName}\n\n`;
          
          rows.forEach((row, index) => {
             // Filter out completely empty rows to save tokens
             if (row.every(cell => !cell || String(cell).trim() === "")) return;

             const rowStr = row.map(cell => {
                 let c = String(cell || "").trim();
                 c = c.replace(/\n/g, " "); // Remove newlines in cells
                 return c;
             }).join(" | ");
             
             markdown += `| ${rowStr} |\n`;
             
             // Add separator after header (assuming first row is header for simplicity, AI figures it out)
             if (index === 0) {
                 const separator = row.map(() => "---").join(" | ");
                 markdown += `| ${separator} |\n`;
             }
          });

          resolve(markdown);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(err);
    }
  });
};

// Kept for fallback/mapping if needed, but updated to be safer
export const readExcelRaw = async (file: File): Promise<RawExcelData> => {
    // ... (This function is less critical now as we use Markdown conversion, 
    // but kept for compatibility if needed in future)
    // Simplified implementation for safety:
    return new Promise((resolve, reject) => {
        try {
            const XLSX = getXLSX();
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const headers = jsonData[0]?.map(String) || [];
                resolve({ headers, rows: jsonData.slice(1) });
            };
            reader.readAsArrayBuffer(file);
        } catch(e) { reject(e); }
    });
};

const extractTextFromWord = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const mammoth = getMammoth();
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
             reject(new Error("Word dosyası okunamadı."));
             return;
        }
        
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then((result: any) => {
            resolve(result.value);
          })
          .catch((err: any) => reject(err));
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(err);
    }
  });
};