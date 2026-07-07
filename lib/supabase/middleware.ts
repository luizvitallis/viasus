import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must run before any auth-dependent logic — refreshes the session token.
  // Fail-safe: se o Supabase estiver indisponível (ex.: projeto free pausado),
  // não trave a app inteira. Após ~3s tratamos como deslogado e seguimos; o
  // guard de /admin então redireciona pro /login em vez de estourar 504
  // MIDDLEWARE_INVOCATION_TIMEOUT na Vercel.
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 3000),
  );
  await Promise.race([
    supabase.auth
      .getUser()
      .then((x) => x.data.user)
      .catch(() => null),
    timeout,
  ]);

  return supabaseResponse;
}
