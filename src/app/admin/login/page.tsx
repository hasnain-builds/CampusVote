"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Vote, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Signing in...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Welcome back!", { id: toastId });
      router.push("/admin-dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Failed to sign in", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl shadow-blue-500/20">
            <Vote className="h-10 w-10" />
          </div>
        </div>
        <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>

        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Sign in to manage your campus elections
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/40 sm:rounded-[24px] sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email" className="text-sm font-bold text-slate-700">
                Email address
              </Label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="admin@school.edu"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-bold text-slate-700">
                Password
              </Label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 font-medium">Don't have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/admin/signup">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Create an admin account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
