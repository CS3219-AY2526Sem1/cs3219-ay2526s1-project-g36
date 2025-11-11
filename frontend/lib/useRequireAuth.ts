
/*
AI Assistance Disclosure:
Tool: ChatGPT (GPT-5)
Scope: Generated React hook skeleton to enforce authentication and redirect unauthenticated users.
Author review: Refined routing logic for Next.js, ensured state sync with Supabase client, and added loading guard.
*/

'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { checkLogin } from './auth';

export function useRequireAuth(loginPath = '/login') {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = () => {
      if (redirected.current) return;
      redirected.current = true;
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
    };

    (async () => {
      const user = await checkLogin();
      if (!user) return redirectToLogin();
      if (!cancelled) setOk(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, loginPath]);

  return ok;
}