
import { createClient } from '@supabase/supabase-js';

// Ortam değişkenlerine güvenli erişim için yardımcı fonksiyon
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

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Sadece değerler varsa client oluştur, aksi halde null döndür
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Kullanıcı verilerini Supabase'den çeker
 */
export const fetchUserSchedule = async () => {
  if (!supabase) {
    console.warn('Supabase bağlantısı kurulamadı. Lütfen VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değişkenlerini kontrol edin.');
    return null;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_schedules')
    .select('schedule_data, config_data')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
    console.error('Veri çekme hatası:', error);
    return null;
  }

  return data ? { schedule: data.schedule_data, config: data.config_data } : null;
};

/**
 * Kullanıcı verilerini Supabase'e kaydeder (Upsert)
 */
export const saveUserSchedule = async (schedule: any, config: any) => {
  if (!supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_schedules')
    .upsert({
      user_id: user.id,
      schedule_data: schedule,
      config_data: config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Kaydetme hatası:', error);
    return false;
  }

  return true;
};
