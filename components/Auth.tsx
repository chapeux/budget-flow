import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Mail, Lock, Key, ArrowLeft, ShieldCheck, Save, Plus } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Detect recovery link from email
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setIsResettingPassword(true);
        setMessage({ type: 'success', text: 'Link validado! Agora, escolha sua nova senha abaixo.' });
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        
        setShowVerification(true);
        setMessage({ 
          type: 'success', 
          text: 'Quase lá! Enviamos um código de confirmação para o seu e-mail.' 
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !email) {
          setMessage({ type: 'error', text: 'E-mail e código são obrigatórios.' });
          return;
      }
      
      setLoading(true);
      setMessage(null);

      try {
          const { error } = await supabase.auth.verifyOtp({
              email,
              token,
              type: 'signup'
          });

          if (error) throw error;
          setMessage({ type: 'success', text: 'E-mail verificado com sucesso! Entrando...' });
      } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Código inválido ou expirado.' });
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: 'Por favor, insira seu e-mail primeiro.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Link de recuperação enviado para o seu e-mail!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail de recuperação.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password || password.length < 6) {
          setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
          return;
      }

      setLoading(true);
      setMessage(null);

      try {
          const { error } = await supabase.auth.updateUser({
              password: password
          });
          if (error) throw error;
          
          setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Você já pode acessar.' });
          setTimeout(() => {
              window.location.hash = '';
              setIsResettingPassword(false);
          }, 2000);
      } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha.' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white transition-colors duration-300">
      {/* Central Container to limit horizontal growth on very large screens */}
      <div className="w-full max-w-[1440px] flex flex-col md:flex-row h-full md:h-[90vh]">
        
        {/* LEFT SIDE: BRANDING & ILLUSTRATION */}
        <div className="hidden md:flex md:w-[55%] flex-col bg-white relative overflow-hidden">
          
          {/* Text Content - Adjusted margins for closer layout */}
          <div className="px-16 lg:px-24 pt-20 max-w-2xl">
            <h2 className="text-5xl lg:text-6xl font-black leading-tight mb-8 text-slate-900 tracking-tight">
              Assuma o controle total da sua <span className="text-emerald-500">jornada financeira.</span>
            </h2>
          </div>

          {/* Illustration - Centered better within its column */}
          <div className="flex-1 flex items-end justify-center p-8 pb-16 lg:pb-24">
            <div 
              className="w-full h-full max-h-[440px] lg:max-h-[480px] bg-no-repeat bg-contain bg-center"
              style={{ backgroundImage: 'url("https://i.imgur.com/Q7V7xyx.png")' }}
            />
          </div>
        </div>

        {/* RIGHT SIDE: FORM */}
        <div className="flex-1 flex flex-col bg-white relative px-8 sm:px-12 md:px-16 lg:px-20 border-l border-slate-50">
          <div className="flex-grow flex flex-col justify-center py-12">
              <div className="md:hidden flex flex-col items-center mb-8">
                  <div className="bg-white p-3 rounded-2xl shadow-lg mb-4 border border-slate-100">
                      <img src="https://i.imgur.com/iS5ZfNx.png" alt="Ativva Logo" className="w-12 h-12 object-contain" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800">Ativva</h1>
              </div>

              <div className="w-full max-w-sm mx-auto">
                
                {isResettingPassword ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-10">
                          <h3 className="text-4xl font-black text-slate-900 mb-2">Nova Senha</h3>
                          <p className="text-slate-400 text-sm font-medium">
                              Crie uma senha forte para seu acesso.
                          </p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                          {message && (
                              <div className={`p-4 rounded-xl text-sm font-medium ${
                                  message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                  {message.text}
                              </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nova Senha</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                              </div>
                              <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12 block w-full rounded-xl border-slate-200 border bg-slate-50 py-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 transition-all"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>

                          <Button 
                              type="submit" 
                              className="w-full justify-center py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-base" 
                              disabled={loading || password.length < 6}
                              isLoading={loading}
                          >
                              Salvar Nova Senha
                          </Button>
                        </form>
                    </div>
                ) : showVerification ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-10">
                          <button 
                              onClick={() => { setShowVerification(false); setMessage(null); }}
                              className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-xs font-bold uppercase tracking-widest mb-6"
                          >
                              <ArrowLeft className="w-4 h-4" /> Voltar
                          </button>
                          <h3 className="text-4xl font-black text-slate-900 mb-2">Verificar</h3>
                          <p className="text-slate-400 text-sm font-medium">
                              Insira o código enviado para <strong className="text-slate-700">{email}</strong>.
                          </p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                          {message && (
                              <div className={`p-4 rounded-xl text-sm font-medium ${
                                  message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                  {message.text}
                              </div>
                          )}

                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Código de 6 dígitos</label>
                              <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                      <Key className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                  </div>
                                  <input
                                      type="text"
                                      required
                                      value={token}
                                      onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                                      className="pl-12 block w-full rounded-xl border-slate-200 border bg-slate-50 py-5 text-3xl tracking-[0.5em] font-black focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 text-center transition-all"
                                      placeholder="000000"
                                      maxLength={6}
                                  />
                              </div>
                          </div>

                          <Button 
                              type="submit" 
                              className="w-full justify-center py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-base" 
                              disabled={loading || token.length < 6}
                              isLoading={loading}
                          >
                              Validar Acesso
                          </Button>
                        </form>
                    </div>
                ) : showForgotPassword ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-10">
                          <button 
                              onClick={() => { setShowForgotPassword(false); setMessage(null); }}
                              className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-xs font-bold uppercase tracking-widest mb-6"
                          >
                              <ArrowLeft className="w-4 h-4" /> Voltar ao Login
                          </button>
                          <h3 className="text-4xl font-black text-slate-900 mb-2">Recuperar</h3>
                          <p className="text-slate-400 text-sm font-medium">
                              Enviaremos um link de recuperação para seu e-mail.
                          </p>
                        </div>

                        <form onSubmit={handleForgotPassword} className="space-y-6">
                          {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${
                              message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {message.text}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Seu E-mail</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                              </div>
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12 block w-full rounded-xl border-slate-200 border bg-slate-50 py-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 transition-all"
                                placeholder="exemplo@email.com"
                              />
                            </div>
                          </div>

                          <Button 
                              type="submit" 
                              className="w-full justify-center py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-base" 
                              disabled={loading || !email}
                              isLoading={loading}
                          >
                              Enviar Link
                          </Button>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-300">
                        <div className="mb-12">
                          <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
                            {isSignUp ? 'Criar sua conta' : 'Acesse o Ativva'}
                          </h3>
                          <p className="text-slate-400 font-medium">
                            {isSignUp ? 'Gerencie suas finanças com inteligência.' : 'Bem-vindo(a) de volta ao seu painel.'}
                          </p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-6">
                          {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                              message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {message.text}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                              </div>
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12 block w-full rounded-xl border-slate-200 border bg-white py-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 transition-all shadow-sm"
                                placeholder="seu@email.com"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha</label>
                              {!isSignUp && (
                                <button 
                                  type="button"
                                  onClick={() => { setShowForgotPassword(true); setMessage(null); }}
                                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest"
                                >
                                  Esqueci minha senha
                                </button>
                              )}
                            </div>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                              </div>
                              <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12 block w-full rounded-xl border-slate-200 border bg-white py-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 transition-all shadow-sm"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>

                          <div className="pt-4">
                            <Button 
                              type="submit" 
                              className="w-full justify-center py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition-all text-base" 
                              disabled={loading}
                              isLoading={loading}
                            >
                              {isSignUp ? 'Criar Conta Grátis' : 'Entrar na Conta'}
                            </Button>
                          </div>
                        </form>

                        <div className="mt-8 text-center">
                          <button
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                            className="text-sm font-semibold text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {isSignUp ? <span>Já tem conta? <strong className="text-emerald-600">Login</strong></span> : <span>Novo por aqui? <strong className="text-emerald-600">Cadastre-se</strong></span>}
                          </button>
                        </div>
                    </div>
                )}
              </div>
          </div>

          <div className="pb-12 text-center flex-shrink-0">
              <p className="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-black">
                  Criptografia de Ponta a Ponta
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};
