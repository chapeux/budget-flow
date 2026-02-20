
import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, ArrowRight, Sparkles, Shield, Zap, 
  BarChart3, Smartphone, Globe, LayoutDashboard, 
  Wallet, ShoppingCart, MessageSquare, Moon, Sun, Cpu,
  Coins, TrendingUp, Landmark, Star, MousePointer2
} from 'lucide-react';
import { Button } from './ui/Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, theme, toggleTheme }) => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId: number;
    
    const handleScroll = () => {
      frameId = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const bgSpeed = scrollY * 0.08;
  const midSpeed = scrollY * 0.15;
  const fastSpeed = scrollY * 0.25;
  const slowSpeed = scrollY * 0.04;

  return (
    <div ref={containerRef} className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 relative overflow-x-hidden">
      
      {/* 1. Base Layer: Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
             backgroundSize: '40px 40px',
             transform: `translateY(${-bgSpeed}px) translateZ(0)`,
             willChange: 'transform'
           }} 
      />

      {/* 2. Decoration Layer: Animated Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute top-[5%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[140px] transition-transform duration-1000 ease-out" 
          style={{ 
            transform: `translate(${mousePos.x * 1.2}px, ${mousePos.y * 1.2 + bgSpeed * 0.5}px) translateZ(0)`,
            willChange: 'transform'
          }}
        />
        <div 
          className="absolute top-[30%] -right-[15%] w-[55%] h-[55%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[140px] transition-transform duration-1000 ease-out" 
          style={{ 
            transform: `translate(${-mousePos.x * 1.8}px, ${-mousePos.y * 1.8 - midSpeed * 0.5}px) translateZ(0)`,
            willChange: 'transform'
          }}
        />
        <div 
          className="absolute bottom-[-10%] left-[15%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[140px] transition-transform duration-1000 ease-out" 
          style={{ 
            transform: `translate(${mousePos.x * 0.8}px, ${mousePos.y * 0.8 + fastSpeed * 0.5}px) translateZ(0)`,
            willChange: 'transform'
          }}
        />
      </div>

      {/* 3. Floating Particles Layer */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
         {[...Array(10)].map((_, i) => (
           <div 
            key={i}
            className="absolute bg-emerald-500/20 dark:bg-emerald-400/10 rounded-full blur-[2px] transition-transform duration-700 ease-linear"
            style={{
                width: `${Math.random() * 6 + 3}px`,
                height: `${Math.random() * 6 + 3}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                transform: `translateY(${scrollY * (0.05 + Math.random() * 0.15)}px) translateZ(0)`,
                willChange: 'transform',
                opacity: 0.3 + Math.random() * 0.4
            }}
           />
         ))}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-emerald-500 p-1.5 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <img src="https://i.imgur.com/iS5ZfNx.png" alt="Ativva" className="w-6 h-6 brightness-0 invert" />
            </div>
            <span className="font-black text-xl tracking-tighter">Ativva</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-emerald-500 transition-colors">Preços</a>
            <a href="#ai" className="hover:text-emerald-500 transition-colors">IA Ativva</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:scale-110 transition-all border border-slate-100 dark:border-slate-800">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={onLogin} className="hidden sm:block text-xs font-black uppercase tracking-widest px-4 py-2 hover:text-emerald-500 transition-colors">Entrar</button>
            <Button onClick={onGetStarted} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 shadow-xl shadow-emerald-600/20 rounded-xl">Começar Agora</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Increased pb-48 to let shadows dissipate */}
      <section className="pt-56 pb-48 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center relative">
          
          {/* Floating Glass Elements */}
          <div 
            className="absolute -top-10 -left-10 md:left-0 w-32 h-32 bg-white/10 dark:bg-slate-800/20 backdrop-blur-md rounded-3xl border border-white/20 dark:border-slate-700/30 shadow-2xl flex items-center justify-center -rotate-12 transition-transform duration-700 ease-out"
            style={{ 
                transform: `translate(${mousePos.x * 0.5}px, ${-midSpeed * 0.15}px) rotate(${-12 + mousePos.x * 0.1}deg) translateZ(0)`,
                willChange: 'transform'
            }}
          >
             <Wallet className="w-12 h-12 text-emerald-500 opacity-80" />
          </div>

          <div 
            className="absolute top-40 -right-5 md:right-0 w-24 h-24 bg-white/10 dark:bg-slate-800/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-2xl flex items-center justify-center rotate-12 transition-transform duration-700 ease-out"
            style={{ 
                transform: `translate(${-mousePos.x * 0.6}px, ${midSpeed * 0.1}px) rotate(${12 - mousePos.y * 0.1}deg) translateZ(0)`,
                willChange: 'transform'
            }}
          >
             <TrendingUp className="w-10 h-10 text-blue-500 opacity-80" />
          </div>

          <div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 mb-10 transition-transform duration-500"
            style={{ transform: `translateY(${-slowSpeed * 0.5}px) translateZ(0)` }}
          >
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Inteligência Financeira Ativva</span>
          </div>

          <h1 
            className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] mb-10 text-slate-900 dark:text-white max-w-5xl mx-auto transition-transform duration-500"
            style={{ transform: `translateY(${-slowSpeed}px) translateZ(0)` }}
          >
            Seu dinheiro no <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-600">piloto automático</span>.
          </h1>

          <p 
            className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto mb-14 font-medium leading-relaxed transition-transform duration-500"
            style={{ transform: `translateY(${-slowSpeed * 1.5}px) translateZ(0)` }}
          >
            Organize orçamentos, acompanhe gastos familiares e use IA para multiplicar seu patrimônio com decisões baseadas em dados.
          </p>

          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 transition-transform duration-500"
            style={{ transform: `translateY(${-slowSpeed * 2}px) translateZ(0)` }}
          >
            <Button onClick={onGetStarted} size="lg" className="w-full sm:w-auto px-12 py-8 text-xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-2xl shadow-emerald-600/30 rounded-2xl hover:scale-105 transition-all">
              Criar Conta Gratuita <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <button onClick={onLogin} className="w-full sm:w-auto px-10 py-5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-all border border-slate-200 dark:border-slate-800">
              Ver Demonstração
            </button>
          </div>

          {/* Enhanced Dashboard Mockup */}
          <div className="mt-32 relative max-w-6xl mx-auto perspective-2000">
            <div 
              className="absolute -inset-10 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 rounded-[4rem] blur-[100px] opacity-40 dark:opacity-20 transition-transform duration-1000 ease-out"
              style={{ 
                transform: `scale(${1 + scrollY * 0.0001}) translateY(${midSpeed * 0.15}px) translateZ(0)`,
                willChange: 'transform'
              }}
            ></div>
            
            <div 
              className="relative rounded-[2.5rem] border-[12px] border-slate-900 dark:border-slate-800 bg-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden aspect-[16/10] transition-all duration-700 ease-out will-change-transform"
              style={{ 
                transform: `rotateX(${Math.min(scrollY * 0.01, 8)}deg) translateY(${slowSpeed}px) scale(${Math.max(0.97, 1 - scrollY * 0.00005)}) translateZ(0)`,
                transformStyle: 'preserve-3d'
              }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10"></div>
                <img src="https://i.imgur.com/1mM3JqH.png" alt="Ativva Dashboard" className="w-full h-full object-cover object-top opacity-100" />
            </div>

            {/* Floating UI Badges */}
            <div 
                className="absolute -bottom-10 -left-10 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-20 transition-transform duration-1000 ease-out"
                style={{ 
                    transform: `translate(${mousePos.x * -1}px, ${-fastSpeed * 0.15}px) translateZ(0)`,
                    willChange: 'transform'
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Check className="w-6 h-6" /></div>
                    <div><p className="text-[10px] text-slate-400 font-black uppercase">Economia</p><p className="font-bold text-slate-900 dark:text-white">+ R$ 1.250,00</p></div>
                </div>
            </div>
            
            <div 
                className="absolute top-1/4 -right-12 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-20 transition-transform duration-1000 ease-out"
                style={{ 
                    transform: `translate(${mousePos.x * 1.5}px, ${-midSpeed * 0.25}px) translateZ(0)`,
                    willChange: 'transform'
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><TrendingUp className="w-6 h-6" /></div>
                    <div><p className="text-[10px] text-slate-400 font-black uppercase">Investimento</p><p className="font-bold text-slate-900 dark:text-white">CDI + 2.5%</p></div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid with Transition Overlay */}
      <section id="features" className="py-40 relative z-10">
        {/* Smooth Transition Gradient Overlay */}
        <div className="absolute inset-0 -top-40 h-[200px] bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/20 pointer-events-none" />
        <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <Landmark className="absolute -right-40 top-0 w-[600px] h-[600px] text-slate-200/40 dark:text-slate-800/10 -rotate-12 pointer-events-none z-0 transition-transform duration-1000" 
            style={{ transform: `translateY(${midSpeed * 0.1}px) rotate(${scrollY * 0.003}deg) translateZ(0)` }}
          />

          <div className="text-center mb-24 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">Uma suíte financeira completa.</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Cada detalhe projetado para simplificar sua relação com o dinheiro.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            {[
              { icon: Wallet, color: 'emerald', title: "Renda Multi-pessoa", desc: "Perfeito para casais e famílias. Centralize todas as fontes de renda em um único fluxo de caixa transparente." },
              { icon: LayoutDashboard, color: 'blue', title: "Gestão Visual de Gastos", desc: "Visualize o destino do seu dinheiro com categorias automáticas e gráficos de evolução mensal." },
              { icon: Smartphone, color: 'purple', title: "Simplicidade em Qualquer Lugar", desc: "Sincronização em tempo real entre todos os seus dispositivos com segurança de nível bancário." },
              { icon: ShoppingCart, color: 'orange', title: "Lista de Compras Pro", desc: "Converta sua lista de mercado em transações instantâneas e acompanhe o histórico de preços." },
              { icon: Shield, color: 'indigo', title: "Privacidade Absoluta", desc: "Modo privacidade de um clique para ocultar valores em público e proteção total dos seus dados." },
              { icon: Cpu, color: 'pink', title: "IA de Alta Performance", desc: "Consultoria financeira 24/7 com IA integrada que aprende seus hábitos e sugere otimizações." },
            ].map((f, i) => (
              <div 
                key={i} 
                className="p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden will-change-transform"
                style={{ 
                  transform: `translateY(${Math.max(0, 60 - scrollY * 0.04 + i * 8)}px) translateZ(0)`,
                  opacity: Math.min(1, (scrollY - 400 + i * 50) / 400)
                }}
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700" />
                
                <div className={`w-16 h-16 rounded-2xl bg-${f.color}-500/10 flex items-center justify-center text-${f.color}-600 mb-8 group-hover:scale-110 group-hover:bg-${f.color}-500 group-hover:text-white transition-all duration-500`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Comece sua jornada hoje.</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Transparência total até nos nossos preços.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div 
              className="p-12 rounded-[3rem] bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-900 flex flex-col relative overflow-hidden transition-all duration-1000 ease-out will-change-transform"
              style={{ transform: `translateX(${Math.max(0, 100 - scrollY * 0.04)}px) translateZ(0)` }}
            >
              <div className="mb-10">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Plano Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">Grátis</span>
                </div>
                <p className="text-slate-500 mt-6 font-medium">Ideal para quem busca o básico da organização pessoal.</p>
              </div>
              <div className="space-y-5 mb-12 flex-1">
                {['Até 2 membros familiares', 'Controle de despesas fixas', 'Lista de compras essencial', 'Gráficos de orçamento padrão', 'Modo Privacidade ilimitado'].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <Button onClick={onGetStarted} variant="secondary" className="w-full py-8 text-lg font-black rounded-2xl border-2 hover:bg-slate-50 transition-all">Começar Free</Button>
            </div>

            {/* Pro Plan */}
            <div 
              className="p-12 rounded-[3rem] bg-slate-900 text-white flex flex-col relative overflow-hidden shadow-2xl shadow-emerald-500/20 ring-8 ring-emerald-500/5 transition-all duration-1000 ease-out will-change-transform"
              style={{ transform: `translateX(${Math.min(0, -100 + scrollY * 0.04)}px) translateZ(0)` }}
            >
              <div className="absolute top-10 right-10">
                <div className="bg-emerald-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg tracking-widest animate-pulse">Escolha Pro</div>
              </div>
              <div className="mb-10">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Plano Investidor</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-400">R$</span>
                  <span className="text-7xl font-black tracking-tighter">19,90</span>
                  <span className="text-lg font-bold text-slate-400">/mês</span>
                </div>
                <p className="text-slate-400 mt-6 font-medium">Libere todo o potencial da inteligência financeira.</p>
              </div>
              <div className="space-y-5 mb-12 flex-1">
                {[
                  'Consultoria Financeira com IA Ativva',
                  'Membros Familiares Ilimitados',
                  'Análise de Ativos e Previsão 10 anos',
                  'Simuladores Financeiros Avançados',
                  'Relatórios Executivos em PDF',
                  'Suporte Prioritário 24h'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm font-bold text-emerald-50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <Button onClick={onGetStarted} className="w-full py-8 text-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl border-none shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all">
                Assinar Plano Pro <Zap className="ml-3 w-5 h-5 fill-current" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 border-t border-slate-100 dark:border-slate-900 px-6 relative z-10 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-xl">
                  <img src="https://i.imgur.com/iS5ZfNx.png" alt="Ativva" className="w-8 h-8 brightness-0 invert" />
                </div>
                <span className="font-black text-3xl tracking-tighter">Ativva</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-sm font-medium">
                Transformando a gestão financeira em uma experiência simples, inteligente e lucrativa.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                <div className="flex flex-col gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Produto</p>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Funcionalidades</a>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Segurança</a>
                </div>
                <div className="flex flex-col gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Suporte</p>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Ajuda</a>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Termos</a>
                </div>
                <div className="flex flex-col gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Empresa</p>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Sobre</a>
                    <a href="#" className="font-bold hover:text-emerald-500 transition-colors">Blog</a>
                </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-10 border-t border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 text-sm font-medium">© 2026 Ativva Finanças Inteligentes. Todos os direitos reservados.</p>
            <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:text-emerald-500 cursor-pointer transition-colors"><Globe className="w-5 h-5" /></div>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:text-emerald-500 cursor-pointer transition-colors"><MessageSquare className="w-5 h-5" /></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
