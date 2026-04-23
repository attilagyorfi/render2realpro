"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";

export function AuthFormCard({ mode }: { mode: AuthMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const submit = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? {
                name,
                email,
              }
            : {
                email,
              }
        ),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Authentication failed.");
      }

      toast.success(isRegister ? "Profile created." : "Signed in.");
      window.location.assign("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-white/10 bg-white/5 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle>{isRegister ? "Create free account" : "Sign in"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Create a local SaaS pilot profile. Your projects will be tied to this profile on this machine."
            : "Sign back into your local pilot profile to continue with your saved projects."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isRegister ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
          />
        ) : null}
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          type="email"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={submitting || !email || (isRegister && name.trim().length < 2)}
        >
          {isRegister ? "Create profile" : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
