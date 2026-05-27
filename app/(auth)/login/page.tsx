'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validation feedback states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailErrorFormat, setEmailErrorFormat] = useState<string | null>(null);

  const validateForm = () => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setEmailErrorFormat(null);

    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailErrorFormat('Invalid email format');
        valid = false;
      }
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('invalid login credentials') || 
          error.message.toLowerCase().includes('invalid credentials')
        ) {
          setErrorMsg('Invalid credentials');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Elite Star HRM</h2>
          <p className="text-sm text-slate-500">Employee Management &amp; Check-in Console</p>
        </div>

        {errorMsg && (
          <div
            data-testid="login-error-message"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate data-hydrated={isMounted ? "true" : "false"}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                  setEmailErrorFormat(null);
                }}
                className={`block w-full rounded-lg border bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 transition-colors ${
                  emailError || emailErrorFormat ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="toiminhvuive@gmail.com"
              />
              {emailError && (
                <p data-testid="email-error" className="mt-1 text-xs text-red-600">
                  {emailError}
                </p>
              )}
              {emailErrorFormat && (
                <p data-testid="email-error-format" className="mt-1 text-xs text-red-600">
                  {emailErrorFormat}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                className={`block w-full rounded-lg border bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 transition-colors ${
                  passwordError ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="••••••••"
              />
              {passwordError && (
                <p data-testid="password-error" className="mt-1 text-xs text-red-600">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-850 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-700/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-slate-400">
          Secure, authenticated portal. Elite Star Company Policy applies.
        </div>
      </div>
    </div>
  );
}
