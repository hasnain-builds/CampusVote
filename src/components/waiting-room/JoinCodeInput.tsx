"use client";

import React from "react";
import { Input } from "@/components/ui/input";

interface JoinCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function JoinCodeInput({ value, onChange, disabled = false }: JoinCodeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // Keep only digits
    if (val.length <= 6) {
      onChange(val);
    }
  };

  return (
    <Input
      type="text"
      maxLength={6}
      placeholder="e.g., 483721"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className="w-full text-center text-lg font-extrabold tracking-widest py-3.5 bg-slate-50 border-slate-200 rounded-2xl placeholder-slate-400 placeholder:font-sans placeholder:tracking-normal focus-visible:ring-blue-500/20 focus-visible:border-blue-600 focus:outline-hidden"
      required
    />
  );
}
