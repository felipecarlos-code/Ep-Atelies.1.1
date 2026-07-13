import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, AlertCircle, HelpCircle, ExternalLink, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; email: string; picture?: string }) => void;
  currentUserEmail: string | null;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Demo bypass state
  const [demoEmail, setDemoEmail] = useState('felipe.carlos@inteli.edu.br');
  const [demoName, setDemoName] = useState('Felipe Carlos');
  const [showDemoBox, setShowDemoBox] = useState(true);

  // Get OAuth configuration status from our Express server
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/google/status');
        if (res.ok) {
          const data = await res.json();
          setIsConfigured(data.configured);
          setClientId(data.clientId);
        }
      } catch (err) {
        console.error('Error fetching Google OAuth status:', err);
      }
    };
    fetchAuthStatus();
  }, []);

  // Listen for message events from the OAuth Popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Security check: validate origin matches standard app domain or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setLoading(false);
        const user = event.data.user;
        onLoginSuccess(user);
      } else if (event.data?.type === 'GOOGLE_AUTH_FAILURE') {
        setLoading(false);
        setError(event.data.error || 'Erro na autenticação do Google.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha ao obter URL de autenticação.');
      }

      const { url } = await res.json();

      // Open Google OAuth popup window
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        setLoading(false);
        setError('O bloqueador de popups impediu a janela do Google. Por favor, libere os popups para este site.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Não foi possível iniciar o login do Google.');
    }
  };

  const handleDemoSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        name: demoName,
        email: demoEmail.trim().toLowerCase(),
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(demoName)}`
      });
      setLoading(false);
    }, 400);
  };

  // Corporate Inteli Logo
  const renderInteliLogo = () => {
    return (
      <div className="relative inline-flex items-end select-none pb-1" id="login-brand-logo">
        <span className="font-sans font-extrabold tracking-tight text-3xl leading-none text-[#2e2640]">
          <span className="relative inline-block">
            ı
            <span className="absolute left-1/2 transform -translate-x-1/2 bg-[#ff4545] rounded-full top-[4px] w-[5.5px] h-[5.5px]"></span>
          </span>
          ntel
          <span className="relative inline-block">
            ı
            <span className="absolute left-1/2 transform -translate-x-1/2 bg-[#ff4545] rounded-full top-[4px] w-[5.5px] h-[5.5px]"></span>
            
            {/* Dotted cluster floating above and to the right */}
            <div className="absolute pointer-events-none top-[-36px] left-[-16px] w-[46px] h-[46px]">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-12">
                <g fill="#ff4545">
                  <circle cx="50" cy="25" r="3.5" />
                  <circle cx="58" cy="27" r="3.2" />
                  <circle cx="66" cy="31" r="2.8" />
                  <circle cx="73" cy="37" r="2.2" />
                  <circle cx="43" cy="33" r="4.0" />
                  <circle cx="51" cy="36" r="3.8" />
                  <circle cx="59" cy="41" r="3.4" />
                  <circle cx="66" cy="48" r="2.8" />
                  <circle cx="72" cy="56" r="2.0" />
                  <circle cx="38" cy="44" r="4.2" />
                  <circle cx="45" cy="48" r="4.0" />
                  <circle cx="53" cy="54" r="3.6" />
                  <circle cx="60" cy="62" r="3.0" />
                  <circle cx="66" cy="71" r="2.2" />
                  <circle cx="35" cy="57" r="4.0" />
                  <circle cx="41" cy="62" r="3.8" />
                  <circle cx="48" cy="69" r="3.4" />
                  <circle cx="54" cy="77" r="2.8" />
                  <circle cx="36" cy="71" r="3.5" />
                  <circle cx="41" cy="77" r="3.2" />
                  <circle cx="46" cy="84" r="2.5" />
                </g>
              </svg>
            </div>
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" id="login-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        {renderInteliLogo()}
        <h2 className="text-xl font-bold text-slate-700">Plataforma de Sprints e Alocações</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200/80 rounded-2xl shadow-sm sm:px-10 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-slate-800">Acesse sua conta</h3>
            <p className="text-xs text-slate-400">Faça login com seu e-mail institucional do Inteli</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Button Google Sign-In */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all shadow-2xs ${
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22c.22-.3.43-.63.66-.92z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335"/>
              </svg>
              <span>{loading ? 'Conectando...' : 'Entrar com o Google'}</span>
            </button>
          </div>

          {/* Setup Instructions for Workspace Administrator */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle size={13} />
                Instruções de Configuração
              </span>
              <button
                onClick={() => setShowDemoBox(!showDemoBox)}
                className="text-[10px] text-[#0f4c5c] font-semibold hover:underline cursor-pointer"
              >
                {showDemoBox ? 'Ocultar Demo' : 'Mostrar Demo'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-500 space-y-2">
              <p className="text-[11px] leading-relaxed">
                Esta ferramenta utiliza <strong>Google OAuth 2.0</strong>. Se for o administrador do Workspace, registre estas informações no seu Google Cloud Console:
              </p>
              <div className="bg-white border border-slate-200/60 rounded p-2 text-[10.5px] font-mono select-all overflow-x-auto break-all">
                {window.location.origin}/api/auth/google/callback
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                Configure as variáveis <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">GOOGLE_CLIENT_ID</code> e <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">GOOGLE_CLIENT_SECRET</code> no seu painel de configurações.
              </p>
            </div>
          </div>

          {/* Demo Login (Bypass) - Crucial for previewing in AI Studio immediately */}
          {showDemoBox && (
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold">Modo de Avaliação (AI Studio Preview)</span>
              </div>
              
              <p className="text-[11px] text-amber-700/80 leading-relaxed">
                Como as chaves do Google dependem de configuração de rede externa, use o login de demonstração abaixo para acessar a ferramenta instantaneamente:
              </p>

              <form onSubmit={handleDemoSignIn} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Nome</label>
                    <input
                      type="text"
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-amber-200/60 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">E-mail</label>
                    <input
                      type="email"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-amber-200/60 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShieldCheck size={13} />
                  Entrar no Modo de Demonstração
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
