"use client";

import React from "react";

interface WaitingRoomStatusProps {
  statusText?: string;
}

export function WaitingRoomStatus({ statusText = "Waiting for admin to start voting..." }: WaitingRoomStatusProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl max-w-xs mx-auto">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      <span className="text-xs font-semibold text-slate-500">{statusText}</span>
    </div>
  );
}
