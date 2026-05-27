import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the Supabase authentication session and handles route guards/RBAC redirects.
 * Must be executed within the root `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, value, { ...options, secure: false });
        },
        remove(name: string, options: any) {
          request.cookies.delete(name);
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0, secure: false });
        },
        getAll() {
          const allCookies = request.cookies.getAll();
          console.log('MIDDLEWARE COOKIES:', allCookies.map(c => c.name));
          return allCookies;
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, secure: false })
          );
        },
      },
      cookieOptions: {
        secure: false,
      },
      global: {
        fetch: (url: any, options?: any) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );

  // Calling auth.getUser() refreshes the session cookie automatically if expired.
  // Using getUser() rather than getSession() prevents cookie manipulation/hijacking on the client.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('MIDDLEWARE AUTH ERROR:', userError);
  } else {
    console.log('MIDDLEWARE AUTH SUCCESS, USER:', user?.email);
  }

  const createRedirectResponse = (targetUrl: URL) => {
    const redirectResponse = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        secure: false,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      });
    });
    return redirectResponse;
  };

  const path = request.nextUrl.pathname;

  // 1. Auth Guard: Define the list of protected paths
  const isProtectedRoute = 
    path === '/' || 
    path.startsWith('/employees') || 
    path.startsWith('/leave') || 
    path.startsWith('/attendance') || 
    path.startsWith('/audit-logs');

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return createRedirectResponse(url);
  }

  // 2. Already Logged-in Guard: Redirect authenticated users away from auth pages
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Redirects to primary dashboard
    return createRedirectResponse(url);
  }

  // 3. RBAC Route Guard: Only Admin and HR can view/manage audit logs
  if (user && path.startsWith('/audit-logs')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'hr')) {
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Redirect back to home overview
      url.searchParams.set('unauthorized', 'true');
      return createRedirectResponse(url);
    }
  }

  // 4. API RBAC Guard: Block non-admin/non-hr access to admin endpoints
  if (path.startsWith('/api/admin/')) {
    if (!user) {
      return new NextResponse(null, { status: 403 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'hr')) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // 5. Immutable Audit Logs Guard: Block updates/deletes to audit logs via REST APIs
  if (path.startsWith('/api/audit-logs/')) {
    const method = request.method;
    if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      return new NextResponse(null, { status: 405 });
    }
  }

  return supabaseResponse;
}
