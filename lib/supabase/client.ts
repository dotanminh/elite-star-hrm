import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-based Supabase client.
 * Safe to be used within Client Components ("use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
      global: {
        fetch: (url: any, options?: any) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
