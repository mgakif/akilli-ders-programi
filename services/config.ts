
/**
 * Ortam değişkenlerine güvenli erişim sağlayan yardımcı fonksiyon.
 */
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  
  return '';
};

export const APP_CONFIG = {
  // BURAYI DÜZENLEYİN: Supabase URL'nizi tırnak içine yapıştırın
  SUPABASE_URL: getEnv('VITE_SUPABASE_URL') || 'https://toildtpftdqifutznnsy.supabase.co',
  
  // BURAYI DÜZENLEYİN: Supabase Anon Key'inizi tırnak içine yapıştırın
  SUPABASE_ANON_KEY: getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_j5f_xG7OnvxFlETKVjOgUQ_NLN2DKn7',
  
  // Gemini API Key otomatik olarak sistemden alınır
  GEMINI_API_KEY: getEnv('API_KEY'),
  
  IS_DEV: true
};

export const isConfigComplete = () => {
  const url = APP_CONFIG.SUPABASE_URL;
  const key = APP_CONFIG.SUPABASE_ANON_KEY;

  const isUrlValid = url && 
                    url !== 'BURAYA_SUPABASE_URL_YAPISTIRIN' && 
                    (url.startsWith('http://') || url.startsWith('https://'));
                    
  const isKeyValid = key && 
                    key !== 'BURAYA_SUPABASE_KEY_YAPISTIRIN';

  return !!(isUrlValid && isKeyValid);
};
