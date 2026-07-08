"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ElectionWithCandidates } from "@/types";
import { LiveParticipantCounter } from "./LiveParticipantCounter";
import { RecentParticipantsList } from "./RecentParticipantsList";
import { WaitingRoomStatus } from "./WaitingRoomStatus";

interface WaitingRoomCardProps {
  election: ElectionWithCandidates;
  rollNumber: string;
  participants: string[];
  count: number;
}

export function WaitingRoomCard({ election, rollNumber, participants, count }: WaitingRoomCardProps) {
  return (
    <div className="text-center space-y-6">
      {/* Success Badge */}
      <div className="space-y-2">
        <div className="h-14 w-14 bg-emerald-50 text-emerald-600 border border-emerald-100/50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Joined Successfully</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Roll Number: <strong className="text-slate-700 font-bold">{rollNumber.toUpperCase()}</strong>
          </p>
        </div>
      </div>

      {/* Roster details card */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-[24px] p-5 text-left space-y-3">
        <div className="text-xs text-slate-500">
          Election: <strong className="text-slate-800 font-bold">{election.title}</strong>
        </div>
        <div className="text-xs text-slate-500">
          Code: <strong className="text-slate-800 font-mono font-bold">{election.join_code}</strong>
        </div>
      </div>

      {/* Live Counter */}
      <LiveParticipantCounter count={count} />

      {/* Roster list */}
      <RecentParticipantsList
        participants={participants}
        currentRollNumber={rollNumber}
      />

      {/* Status Badge */}
      <WaitingRoomStatus />
    </div>
  );
}
