"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

const reducedMotionContainerVariants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const reducedMotionItemVariants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

function AnimatedFeedback({
  error,
  message,
  reducedMotion,
}: {
  error: string | null;
  message: string | null;
  reducedMotion: boolean;
}) {
  const feedbackTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: EASE_OUT };

  return (
    <>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={feedbackTransition}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {message ? (
          <motion.p
            key="message"
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={feedbackTransition}
            className="text-sm text-muted-foreground"
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/tasks";
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const motionContainerVariants = prefersReducedMotion
    ? reducedMotionContainerVariants
    : containerVariants;
  const motionItemVariants = prefersReducedMotion
    ? reducedMotionItemVariants
    : itemVariants;

  async function handlePasswordSignIn(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    setIsLoading(false);

    if (magicLinkError) {
      setError(magicLinkError.message);
      return;
    }

    setMessage("Check your email for a magic link to sign in.");
  }

  function handleTabChange(value: string) {
    setActiveTab(value);
    setError(null);
    setMessage(null);
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-6"
      style={{
        backgroundImage: "url('/assets/img/Team_collaboration_hero_image_ecf3eec7.png')",
      }}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={motionContainerVariants}
        initial="hidden"
        animate="show"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <motion.div
              variants={motionItemVariants}
              className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              <p className="text-base">Ji</p>
            </motion.div>
            <motion.div variants={motionItemVariants}>
              <CardTitle>Sign in to Jiganto</CardTitle>
              <CardDescription>
                Use a demo account from the seed script, or request a magic link.
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div variants={motionItemVariants}>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="password">Email & password</TabsTrigger>
                  <TabsTrigger value="magic">Magic link</TabsTrigger>
                </TabsList>

                <div className="relative mt-2 min-h-[17.5rem]">
                  <AnimatePresence mode="wait">
                    {activeTab === "password" ? (
                      <motion.div
                        key="password"
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, x: -8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, x: 8 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.2, ease: EASE_OUT }
                        }
                      >
                        <form
                          onSubmit={handlePasswordSignIn}
                          className="space-y-4 pt-2"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              autoComplete="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="alex@demo.jiganto.app"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                              id="password"
                              type="password"
                              autoComplete="current-password"
                              value={password}
                              onChange={(event) =>
                                setPassword(event.target.value)
                              }
                              placeholder="Demo123!"
                              required
                            />
                          </div>
                          <AnimatedFeedback
                            error={error}
                            message={null}
                            reducedMotion={!!prefersReducedMotion}
                          />
                          <Button
                            type="submit"
                            className="w-full bg-emerald-700 shadow-md transition-all duration-300 hover:bg-emerald-800 hover:shadow-lg"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Sign in
                          </Button>
                        </form>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="magic"
                        initial={
                          prefersReducedMotion ? false : { opacity: 0, x: 8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, x: -8 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.2, ease: EASE_OUT }
                        }
                      >
                        <form
                          onSubmit={handleMagicLink}
                          className="space-y-4 pt-2"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="magic-email">Email</Label>
                            <Input
                              id="magic-email"
                              type="email"
                              autoComplete="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="you@company.com"
                              required
                            />
                          </div>
                          <AnimatedFeedback
                            error={error}
                            message={message}
                            reducedMotion={!!prefersReducedMotion}
                          />
                          <Button
                            type="submit"
                            className="w-full bg-emerald-700 shadow-md transition-all duration-300 hover:bg-emerald-800 hover:shadow-lg"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Send magic link
                          </Button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>
            </motion.div>

            <motion.p
              variants={motionItemVariants}
              className="mt-6 text-center text-xs text-muted-foreground"
            >
              Demo users: alex, sam, or jordan @demo.jiganto.app — password{" "}
              <code className="rounded bg-muted px-1">Demo123!</code>
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
