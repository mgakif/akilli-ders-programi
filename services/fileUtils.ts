// Access global libraries loaded via CDN in index.html
const XLSX = (window as any).XLSX;
const mammoth = (window as any).mammoth;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    return extractTextFromExcel(file);
  } else if (extension === 'docx') {
    return extractTextFromWord(file);
  } else {
    throw new Error("Desteklenmeyen dosya formatı. Lütfen .xlsx veya .docx dosyası yükleyin.");
  }
};

const extractTextFromExcel = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let fullText = "";
        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert sheet to CSV first as it preserves some structure better for AI than raw text
          const sheetText = XLSX.utils.sheet_to_csv(worksheet);
          fullText += `--- SHEET: ${sheetName} ---\n${sheetText}\n`;
        });
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

const extractTextFromWord = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      mammoth.extractRawText({ arrayBuffer: arrayBuffer })
        .then((result: any) => {
          resolve(result.value);
        })
        .catch((err: any) => reject(err));
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};