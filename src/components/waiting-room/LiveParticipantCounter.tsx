"use client";

import React from "react";
import { Users } from "lucide-react";

interface LiveParticipantCounterProps {
  count: number;
}

export function LiveParticipantCounter({ count }: LiveParticipantCounterProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-[20px] p-5 flex items-center justify-between">
      <div className="text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joined Students</span>
        <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">{count}</h4>
      </div>
      <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/50 relative">
        <Users className="h-5 w-5" />
        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
        </span>
      </div>
    </div>
  );
}
