
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Mail, Lock, Key, ArrowLeft, Check, Circle, Sun, Moon, Eye, EyeOff, Cpu, Users, Activity, BarChart3, ChevronLeft } from 'lucide-react';

interface AuthProps {
  onFinishedRecovery?: () => void;
  onBack?: () => void;
}

// Componente para um único dígito do odômetro
const OdometerDigit: React.FC<{ digit: string; delay: number }> = ({ digit, delay }) => {
  const isNumber = !isNaN(parseInt(digit));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isNumber) {
    return <span className="inline-block">{digit}</span>;
  }

  const num = parseInt(digit);

  return (
    <span className="inline-flex flex-col h-[1em] overflow-hidden leading-none relative top-[0.05em]">
      <span 
        className="flex flex-col transition-transform duration-[1500ms] ease-[cubic-bezier(0.45,0.05,0.55,0.95)]"
        style={{ 
          transform: mounted ? `translateY(-${num * 10}%)` : 'translateY(0%)',
          transitionDelay: `${delay}ms`
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-full flex items-center justify-center">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
};

// Componente principal do Odômetro
const Odometer: React.FC<{ value: number; decimals?: number; suffix?: string; prefix?: string }> = ({ 
  value, 
  decimals = 0, 
  suffix = "", 
  prefix = "" 
}) => {
  const formatted = value.toLocaleString('pt-BR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });

  const characters = useMemo(() => {
    return formatted.split('');
  }, [formatted]);

  return (
    <span className="inline-flex items-center tabular-nums">
      {prefix && <span>{prefix}</span>}
      {characters.map((char, idx) => (
        <OdometerDigit 
          key={`${idx}-${char}`} 
          digit={char} 
          delay={idx * 100}
        />
      ))}
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

export const Auth: React.FC<AuthProps> = ({ onFinishedRecovery, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Real Stats from Public Table
  const [stats, setStats] = useState({
      members: 0,
      transactions: 0,
      volume: 0,
      loaded: false
  });
  
  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_stats')
          .select('total_members, total_transactions, total_volume')
          .eq('id', 1)
          .single();

        if (data && !error) {
            setStats({
                members: data.total_members || 0,
                transactions: data.total_transactions || 0,
                volume: data.total_volume || 0,
                loaded: true
            });
        } else {
            setStats(s => ({ ...s, loaded: true }));
        }
      } catch (err) {
        console.error("Erro ao buscar estatísticas públicas", err);
      }
    };
    fetchPublicStats();
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const passwordRequirements = useMemo(() => ({
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    matches: password === confirmPassword && confirmPassword !== ''
  }), [password, confirmPassword]);

  const isFormValid = useMemo(() => {
    if (isSignUp || isResettingPassword) {
      return passwordRequirements.length && passwordRequirements.hasLetter && passwordRequirements.hasNumber && passwordRequirements.matches;
    }
    return password.length > 0;
  }, [isSignUp, isResettingPassword, passwordRequirements, password]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        setShowVerification(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
          if (error) throw error;
      } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Código inválido.' });
      } finally {
          setLoading(false);
      }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          setMessage({ type: 'success', text: 'Senha atualizada! Redirecionando...' });
          setTimeout(() => { if (onFinishedRecovery) onFinishedRecovery(); else window.location.reload(); }, 1500);
      } catch (error: any) {
          setMessage({ type: 'error', text: error.message });
      } finally {
          setLoading(false);
      }
  };

  const Requirement = ({ met, text }: { met: boolean, text: string }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${met ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
      {met ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
      {text}
    </div>
  );

  const PasswordVisibilityToggle = () => (
    <button type="button" onClick={() => setShowPasswordText(!showPasswordText)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 dark:text-slate-600 transition-colors">
      {showPasswordText ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden text-sm px-4">
      
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header Bar */}
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <img src="https://i.imgur.com/iS5ZfNx.png" alt="Ativva" className="w-6 h-6 brightness-0 invert" />
              </div>
              <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">Ativva</span>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
              >
                <ChevronLeft className="w-4 h-4" />
                Início
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:scale-110 transition-all border border-slate-200 dark:border-slate-800 shadow-sm">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
      </div>

      {/* Main Container: Split Info and Auth Card */}
      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 pt-10">
        
        {/* Left Side: Branding Info & Stats (No image) */}
        <div className="flex-1 text-center lg:text-left animate-in fade-in slide-in-from-left-4 duration-700">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6 text-slate-900 dark:text-white tracking-tight">
                Sua gestão <span className="text-emerald-500 underline decoration-emerald-500/20">transparente</span> e inteligente.
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-medium mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Organize orçamentos, acompanhe gastos e receba conselhos de IA baseados em dados reais da plataforma.
            </p>

            {/* Platform Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto lg:mx-0">
                <div className="flex flex-col items-center lg:items-start p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Membros</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                        {stats.loaded ? <Odometer value={stats.members} /> : '...'}
                    </span>
                </div>
                <div className="flex flex-col items-center lg:items-start p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transações</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                        {stats.loaded ? <Odometer value={stats.transactions} /> : '...'}
                    </span>
                </div>
                <div className="flex flex-col items-center lg:items-start p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                        {stats.loaded ? (
                            <Odometer 
                            value={stats.volume / 1000000} 
                            decimals={1} 
                            prefix="R$ " 
                            suffix="mi" 
                            />
                        ) : '...'}
                    </span>
                </div>
            </div>
        </div>

        {/* Right Side: Compact Auth Card */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-none transition-all">
            
            {isResettingPassword ? (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Nova Senha</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Defina sua nova credencial de acesso.</p>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      {message && <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{message.text}</div>}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                          <input type={showPasswordText ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12 pr-12 block w-full rounded-xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 py-4 text-sm outline-none transition-all dark:text-white" placeholder="••••••••" />
                          <PasswordVisibilityToggle />
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                        <Requirement met={passwordRequirements.length} text="8+ Caracteres" /><Requirement met={passwordRequirements.hasLetter} text="Letras" /><Requirement met={passwordRequirements.hasNumber} text="Números" /><Requirement met={passwordRequirements.matches} text="Coincidem" />
                      </div>
                      <Button type="submit" className="w-full py-5 bg-emerald-600 font-bold rounded-2xl shadow-lg shadow-emerald-600/20" disabled={loading || !isFormValid} isLoading={loading}>Atualizar Senha</Button>
                    </form>
                </div>
            ) : showForgotPassword ? (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                      <button onClick={() => { setShowForgotPassword(false); setMessage(null); }} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-xs font-bold uppercase tracking-widest mb-6"><ArrowLeft className="w-4 h-4" /> Voltar ao Login</button>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Recuperar Acesso</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Enviaremos um link para resetar sua senha.</p>
                    </div>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      {message && <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{message.text}</div>}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de cadastro</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 block w-full rounded-2xl border-slate-200 dark:border-slate-800 border bg-white dark:bg-slate-900 py-4 text-sm focus:border-emerald-500 outline-none transition-all dark:text-white shadow-sm" placeholder="seu@email.com" />
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20" disabled={loading || !email} isLoading={loading}>
                          Enviar E-mail de Recuperação
                        </Button>
                      </div>
                    </form>
                </div>
            ) : showVerification ? (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                      <button onClick={() => setShowVerification(false)} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-xs font-bold uppercase tracking-widest mb-6"><ArrowLeft className="w-4 h-4" /> Voltar</button>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Verificar</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Enviamos um código para <strong className="text-slate-700 dark:text-slate-300">{email}</strong>.</p>
                    </div>
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de 6 dígitos</label>
                          <div className="relative group">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                              <input type="text" required value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} className="pl-12 block w-full rounded-xl border-slate-200 dark:border-slate-800 border bg-slate-50 dark:bg-slate-800/50 py-5 text-3xl tracking-[0.5em] font-black focus:border-emerald-500 outline-none text-center transition-all dark:text-white" placeholder="000000" maxLength={6} />
                          </div>
                      </div>
                      <Button type="submit" className="w-full py-5 bg-emerald-600 font-bold rounded-2xl shadow-lg shadow-emerald-600/20" disabled={loading || token.length < 6} isLoading={loading}>Confirmar Código</Button>
                    </form>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-10 text-center">
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">{isSignUp ? 'Criar conta' : 'Acesse o Painel'}</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium px-2">{isSignUp ? 'Junte-se à nova era das finanças inteligentes.' : 'Bem-vindo(a) de volta ao seu gestor financeiro.'}</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                      {message && <div className="p-4 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-100">{message.text}</div>}
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 block w-full rounded-2xl border-slate-200 dark:border-slate-800 border bg-white dark:bg-slate-900 py-4 text-sm focus:border-emerald-500 outline-none transition-all dark:text-white shadow-sm" placeholder="seu@email.com" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                          {!isSignUp && <button type="button" onClick={() => { setShowForgotPassword(true); setMessage(null); }} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Recuperar acesso</button>}
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                          <input type={showPasswordText ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12 pr-12 block w-full rounded-xl border-slate-200 dark:border-slate-800 border bg-white dark:bg-slate-900 py-4 text-sm focus:border-emerald-500 outline-none transition-all dark:text-white shadow-sm" placeholder="••••••••" />
                          <PasswordVisibilityToggle />
                        </div>
                      </div>

                      {isSignUp && (
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                              <input type={showPasswordText ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-4 pr-12 block w-full rounded-2xl border-slate-200 dark:border-slate-800 border bg-white dark:bg-slate-900 py-4 text-sm focus:border-emerald-500 outline-none transition-all dark:text-white shadow-sm" placeholder="••••••••" />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                              <Requirement met={passwordRequirements.length} text="8+ Caracteres" /><Requirement met={passwordRequirements.hasLetter} text="Letras" /><Requirement met={passwordRequirements.hasNumber} text="Números" /><Requirement met={passwordRequirements.matches} text="Coincidem" />
                            </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20" disabled={loading || (isSignUp && !isFormValid)} isLoading={loading}>
                          {isSignUp ? 'Começar Gratuitamente' : 'Entrar no Sistema'}
                        </Button>
                      </div>
                    </form>

                    <div className="mt-8 text-center">
                      <button onClick={() => { setIsSignUp(!isSignUp); setMessage(null); setPassword(''); setConfirmPassword(''); }} className="text-sm font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                        {isSignUp ? <span>Já é membro? <strong className="text-emerald-600 font-black">Login</strong></span> : <span>Novo por aqui? <strong className="text-emerald-600 font-black">Criar conta grátis</strong></span>}
                      </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 text-center flex flex-col items-center gap-4 relative z-10">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">© 2026 Ativva. Todos os direitos reservados.</p>
      </div>

    </div>
  );
};
