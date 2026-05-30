import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-6"
      style={{
        backgroundImage: "url('/assets/img/post-series-a-startups.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
      <div className="relative z-10 h-40 w-full max-w-md animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
