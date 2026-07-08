"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { ElectionService } from "@/services/election";
import { WaitingRoomService } from "@/services/waiting-room";
import { ElectionWithCandidates } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { JoinCodeInput } from "./JoinCodeInput";

interface StudentJoinFormProps {
  initialCode?: string;
  onJoinSuccess: (election: ElectionWithCandidates, rollNumber: string) => void;
}

export function StudentJoinForm({ initialCode = "", onJoinSuccess }: StudentJoinFormProps) {
  const [joinCode, setJoinCode] = useState(initialCode);
  const [rollNumber, setRollNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (joinCode.length !== 6) {
      toast.error("Please enter a valid 6-digit join code.");
      return;
    }

    if (!rollNumber.trim()) {
      toast.error("Please enter your roll number.");
      return;
    }

    const cleanCode = joinCode.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();

    setIsSubmitting(true);
    const toastId = toast.loading("Checking join code...");

    try {
      // 1. Fetch election details
      const election = await ElectionService.getElectionByJoinCode(cleanCode);

      // 2. Validate election status
      if (election.status === "ended") {
        toast.error("This election has already completed.", { id: toastId });
        setIsSubmitting(false);
        return;
      }

      // 3. Attempt to join waiting room
      // (This will fail with a message if the roll number is already in the waiting room)
      await WaitingRoomService.joinElection(election.id, cleanRoll);
      
      toast.success("Joined waiting room!", { id: toastId });
      onJoinSuccess(election, cleanRoll);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to join election.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Join Room</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit poll code and your roll number to start.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 text-left">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Join Code
          </Label>
          <JoinCodeInput
            value={joinCode}
            onChange={setJoinCode}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="studentRoll" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Your Roll Number
          </Label>
          <Input
            id="studentRoll"
            type="text"
            placeholder="eg. 334"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3.5 bg-slate-50 border-slate-200 rounded-2xl text-slate-800 font-bold text-center uppercase focus-visible:ring-blue-500/20 focus-visible:border-blue-600 focus:outline-hidden text-base"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="group flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 disabled:opacity-75"
      >
        {isSubmitting ? "Connecting..." : "Enter Waiting Room"}
        {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
    </form>
  );
}
