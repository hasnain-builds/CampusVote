"use client";

import React, { useState, useEffect } from "react";
import { Vote, BadgeCheck, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ElectionService } from "@/services/election";
import { ElectionWithCandidates } from "@/types";
import { CreateElectionDialog } from "@/components/dashboard/CreateElectionDialog";
import { ElectionList } from "@/components/dashboard/ElectionList";

export default function AdminDashboardPage() {
  const [elections, setElections] = useState<ElectionWithCandidates[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadElections = async () => {
    try {
      const data = await ElectionService.getAllElections();
      setElections(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load elections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadElections();
  }, []);

  const handleCreateSuccess = (newElection: ElectionWithCandidates) => {
    // Refresh election roster and pre-select or update local list
    setElections((prev) => [newElection, ...prev]);
  };

  // Compute metrics
  const totalElections = elections.length;
  const activeElections = elections.filter((e) => e.status === "live" || e.status === "draft").length;
  const completedElections = elections.filter((e) => e.status === "ended").length;

  return (
    <div className="space-y-8">
      {/* Top Welcome Title & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Elections Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your classroom elections, launch waiting room lobbies, and monitor voter activity.
          </p>
        </div>
        <div className="flex shrink-0">
          <CreateElectionDialog onSuccess={handleCreateSuccess} />
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Elections */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-36 text-left hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Elections
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50">
              <Vote className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? "--" : totalElections}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1">
              Elections launched
            </span>
          </div>
        </div>

        {/* Active Elections */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-36 text-left hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Polls
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
              <Play className="h-4.5 w-4.5 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? "--" : activeElections}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1">
              Lobby or live voting active
            </span>
          </div>
        </div>

        {/* Completed Elections */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-36 text-left hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Concluded Polls
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
              <BadgeCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? "--" : completedElections}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1">
              Final tallies declared
            </span>
          </div>
        </div>
      </div>

      {/* Main Console Content */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 text-left">Your Classroom Elections</h2>
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <ElectionList elections={elections} onDeleteSuccess={loadElections} />
        )}
      </div>
    </div>
  );
}
