
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from './config';

/**
 * Verilen dizginin geçerli bir URL olup olmadığını kontrol eder.
 * Supabase createClient'ın geçersiz URL ile hata vermesini önler.
 */
const isValidSupabaseUrl = (url: string): boolean => {
  if (!url || url.includes('BURAYA_SUPABASE_URL_YAPISTIRIN')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Sadece geçerli bir URL ve anahtar varsa client oluştur
export const supabase = isValidSupabaseUrl(APP_CONFIG.SUPABASE_URL) && APP_CONFIG.SUPABASE_ANON_KEY && !APP_CONFIG.SUPABASE_ANON_KEY.includes('BURAYA_SUPABASE_KEY_YAPISTIRIN')
  ? createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY) 
  : null;

/**
 * Kullanıcı verilerini Supabase'den çeker
 */
export const fetchUserSchedule = async () => {
  if (!supabase) {
    console.warn('Supabase bağlantısı kurulamadı. Konfigürasyonu kontrol edin.');
    return null;
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_schedules')
      .select('schedule_data, config_data')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Veri çekme hatası:', error);
      return null;
    }

    return data ? { schedule: data.schedule_data, config: data.config_data } : null;
  } catch (e) {
    console.error('Supabase fetch error:', e);
    return null;
  }
};

/**
 * Kullanıcı verilerini Supabase'e kaydeder (Upsert)
 */
export const saveUserSchedule = async (schedule: any, config: any) => {
  if (!supabase) return false;

  try {
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
  } catch (e) {
    console.error('Supabase save error:', e);
    return false;
  }
};
