"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

            <div className="space-y-1 text-left">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                 Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 dark:text-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                {error}
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
                mode === 'login' ? 'Iniciar Sesión' : 'Registrar Usuario'
              )}
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
