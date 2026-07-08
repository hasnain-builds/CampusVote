"use client";

import React from "react";

interface RecentParticipantsListProps {
  participants: string[];
  currentRollNumber?: string;
}

export function RecentParticipantsList({ participants, currentRollNumber }: RecentParticipantsListProps) {
  // Show only the 12 most recent joins
  const recentList = participants.slice(-12);

  return (
    <div className="space-y-3 text-left">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recent Participants</span>
      {recentList.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Lobby is currently empty.</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {recentList.map((roll, index) => {
            const isSelf = currentRollNumber && roll === currentRollNumber.toUpperCase();
            return (
              <span
                key={index}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                  isSelf
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/10"
                    : "bg-white text-slate-700 border-slate-200/60"
                }`}
              >
                {roll}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
