"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

import { useLocale, useTranslations } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const swapLocale = () => {
     window.location.href = locale === 'es' ? '/en/login' : '/es/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/invalid-credential') {
        setError('Las credenciales son incorrectas.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Se produjo un error inesperado al procesar la autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setResetSuccess(false);
    try {
      const provider = new GoogleAuthProvider();
      // Configure for safer popup handling preventing tracking blockers globally
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (e) {
      const err = e as { code?: string, message?: string };
      // Gracefully ignore if the user simply closed the popup
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
         setError(`${tAuth('googleSignInFailed')} [${err.code || 'unknown'}]: ${err.message || ''}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(tAuth('enterEmailForReset'));
      return;
    }
    setLoading(true);
    setError(null);
    setResetSuccess(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
    } catch {
      setError(tAuth('passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Absolute Header Branding */}
      <div className="absolute top-8 left-8 flex items-center space-x-3">
        <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center">
            <span className="text-white dark:text-black font-extrabold text-xl tracking-tighter">R</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 hidden sm:block">
            RVP Albums
        </span>
      </div>

      {/* Locale Switcher */}
      <div className="absolute top-8 right-8 flex items-center">
        <button 
           onClick={swapLocale}
           className="text-sm font-semibold rounded-full px-4 py-2 bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
        >
           {locale === 'es' ? '🇺🇸 Eng' : '🇪🇸 Esp'}
        </button>
      </div>

      <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">
        
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/5 dark:shadow-black/40">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-2">
              {mode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {mode === 'login' 
                ? 'Ingresa tus credenciales para acceder a tus proyectos.' 
                : 'Registra un nuevo usuario para el sistema SaaS.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
            <div className="space-y-1 text-left">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                 Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 dark:text-white"
              />
            </div>

            <div className="space-y-1 text-left relative">
              <div className="flex items-center justify-between ml-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                 <label>
                    {locale === 'es' ? 'Contraseña' : 'Password'}
                 </label>
                 {mode === 'login' && (
                    <button 
                       type="button" 
                       onClick={handleForgotPassword}
                       disabled={loading}
                       className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                    >
                       {tAuth('forgotPassword')}
                    </button>
                 )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 dark:text-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none p-1"
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                {error}
              </div>
            )}

            {resetSuccess && (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-900/50">
                {tAuth('passwordResetSent')}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold rounded-xl transition-all shadow-md focus:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                mode === 'login' ? (locale === 'es' ? 'Iniciar Sesión' : 'Sign In') : (locale === 'es' ? 'Registrar Usuario' : 'Sign Up')
              )}
            </button>

            {/* Visual Divider */}
            <div className="flex items-center space-x-3 my-4 opacity-50">
                <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700"></div>
                <span className="text-xs font-medium text-neutral-500">{locale === 'es' ? 'O CONTINUAR CON' : 'OR CONTINUE WITH'}</span>
                <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{tAuth('continueWithGoogle')}</span>
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
             <button 
                 onClick={() => {
                     setMode(mode === 'login' ? 'register' : 'login');
                     setError(null);
                 }}
                 className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
             >
                {mode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
             </button>
          </div>
        </div>
        
        <div className="mt-8 text-center opacity-40 hover:opacity-100 text-xs text-neutral-500 dark:text-neutral-500 transition-opacity">
            Plataforma protegida con Firebase Auth <br />
            © {new Date().getFullYear()} RVP Albums Editor
        </div>
      </div>
    </div>
  );
}
