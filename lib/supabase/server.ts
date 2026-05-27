import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client.
 * Safe to be used within Server Components, Server Actions, and Route Handlers.
 * Handles read-only request cookie retrieval as well as cookie writing during actions/mutations.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === 'production' });
          } catch {
            // Ignored from Server Components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0, secure: process.env.NODE_ENV === 'production' });
          } catch {
            // Ignored from Server Components
          }
        },
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === 'production' })
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is expected and can be ignored since the middleware 
            // handles session/token refreshing on every request.
          }
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
      global: {
        fetch: (url: any, options?: any) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
