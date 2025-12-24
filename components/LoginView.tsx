import React, { useState } from 'react';
import { Lock, Mail, KeyRound, Loader2, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface LoginViewProps {
  onLogin: (success: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
        setError("Supabase yapılandırması eksik.");
        return;
    }

    setLoading(true);
    setError('');

    try {
        if (isRegistering) {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });
            if (signUpError) throw signUpError;
            setError("Kayıt başarılı! Lütfen e-postanızı onaylayın veya giriş yapın.");
            setIsRegistering(false);
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) throw signInError;
            onLogin(true);
        }
    } catch (err: any) {
        setError(err.message || "Bir hata oluştu.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100 animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-100 mb-4 transform -rotate-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {isRegistering ? "Hesap Oluştur" : "Öğretmen Girişi"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Akıllı Ders Programı Asistanı</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">E-Posta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-300" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                placeholder="ornek@okul.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Şifre</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-300" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-xs font-medium bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isRegistering ? <><UserPlus className="w-5 h-5" /> Kayıt Ol</> : <><LogIn className="w-5 h-5" /> Giriş Yap</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
                {isRegistering ? "Zaten bir hesabım var" : "Yeni bir hesap oluştur"}
            </button>
        </div>
      </div>
    </div>
  );
};