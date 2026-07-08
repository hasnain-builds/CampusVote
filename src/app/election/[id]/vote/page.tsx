"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Timer, AlertCircle, Loader2, Check, Lock, RotateCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useRealtimeElection } from "@/hooks/useRealtimeElection";
import { useVoting } from "@/hooks/useVoting";
import { formatTime, parseUTCDate } from "@/utils/countdown";
import { getFriendlyElectionType } from "@/utils/election";

interface PageProps {
  params: Promise<{ id: string }>;
}

function StudentVotingContent({ electionId }: { electionId: string }) {
  const router = useRouter();

  // ── Student credentials from localStorage ──
  const [rollNumber, setRollNumber] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load student credentials from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedElectionId = localStorage.getItem("campusvote.electionId");
      const storedRollNumber = localStorage.getItem("campusvote.rollNumber");

      if (!storedElectionId || !storedRollNumber || storedElectionId !== electionId) {
        toast.error("Please join the election waiting room first.");
        router.replace("/student");
        return;
      }

      setRollNumber(storedRollNumber);
    }
  }, [electionId, router]);

  // ── Single source of truth: shared realtime election hook ──
  const { election, isLoading: isLoadingElection, refetch } = useRealtimeElection(electionId);

  // Redirect to waiting room if election is in draft
  useEffect(() => {
    if (election && election.status === "draft") {
      toast.error("Voting has not started yet.");
      router.replace("/student");
    }
  }, [election?.status, router]);

  // ── Voting hook — checks hasVoted + submits ──
  const { hasVoted, isLoading: isLoadingVote, isSubmitting, submitVote } = useVoting(
    electionId,
    rollNumber || ""
  );

  // ── Force Sync — full state refresh ──
  const handleForceSync = async () => {
    const toastId = toast.loading("Syncing with database...");
    try {
      await refetch();
      toast.success("Synchronized successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync: " + err.message, { id: toastId });
    }
  };

  // ── Countdown timer — driven entirely by election.end_time ──
  useEffect(() => {
    if (!election) return;

    if (election.status !== "live") {
      if (election.status === "ended") {
        setTimeLeft(0);
      }
      return;
    }

    // status === "live" — tick every second using end_time
    const tick = () => {
      const now = new Date();
      
      const parsedEnd = parseUTCDate(election.end_time);
      if (!parsedEnd) {
        console.error("[Student Timer Error] end_time is null/missing/invalid for live election", {
          currentTime: now.toISOString(),
          voting_started_at: election.voting_started_at,
          end_time: election.end_time
        });
        return;
      }

      const t = parsedEnd.getTime();
      const remaining = Math.max(0, Math.floor((t - now.getTime()) / 1000));
      setTimeLeft(remaining);

      // Temporary debug logs
      console.log("[Student Timer Debug Tick]", {
        currentTime: now.toISOString(),
        voting_started_at: election.voting_started_at,
        end_time: election.end_time,
        remainingTime: remaining
      });
    };

    tick(); // initial

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [election?.status, election?.end_time]);

  // Keyboard handler for Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowConfirm(false);
      }
    };
    if (showConfirm) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirm]);

  const handleCastVoteClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      toast.error("Please select a candidate first.");
      return;
    }
    setShowConfirm(true);
  };

  // ── isElectionEnded: ONLY trust the database status field ──
  // NEVER use Date.now() > end_time as a second source of truth.
  // The database status is the SINGLE authority.
  const isElectionEnded = election?.status === "ended";

  const handleConfirmVote = async () => {
    if (!selectedCandidateId) return;

    if (isElectionEnded) {
      toast.error("This election has ended.");
      setShowConfirm(false);
      return;
    }
    
    // Close confirmation dialog first
    setShowConfirm(false);
    
    try {
      await submitVote(selectedCandidateId);
      toast.success("Vote cast successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit your vote.");
    }
  };

  const isElectionLoading = isLoadingElection || isLoadingVote;
  const selectedCandidateName = election?.candidates?.find(c => c.id === selectedCandidateId)?.name || "";

  // ── Loading state ──
  if (isElectionLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">Checking credentials...</span>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center font-sans px-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 max-w-sm w-full text-center shadow-xs space-y-4">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Election Not Found</h3>
          <p className="text-xs text-slate-500 leading-normal">We could not load the election details. Please try joining again.</p>
          <Link href="/student" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
            Go to Lobby
          </Link>
        </div>
      </div>
    );
  }

  // ── 1. Success state: student has already voted ──
  if (hasVoted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between overflow-hidden font-sans">
        <header className="relative z-10 border-b border-slate-200/50 bg-white px-6 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-slate-900">
              Campus<span className="text-blue-600">Vote</span>
            </span>
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
              Vote Recorded
            </span>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 text-center shadow-xs space-y-6">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vote Successfully Submitted</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Thank you for participating. Your vote has been securely recorded.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Election: {election.title}
              </p>
            </div>
          </div>
        </main>

        <footer className="relative z-10 py-6 text-center border-t border-slate-200/50 bg-white">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CampusVote Hub</p>
        </footer>
      </div>
    );
  }

  // ── 2. Election Closed: status === "ended" and student has NOT voted ──
  if (isElectionEnded) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between overflow-hidden font-sans">
        <header className="relative z-10 border-b border-slate-200/50 bg-white px-6 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-slate-900">
              Campus<span className="text-blue-600">Vote</span>
            </span>
            <span className="flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200/50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
              Closed
            </span>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 text-center shadow-xs space-y-6">
            <div className="h-12 w-12 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Election Closed</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voting has ended.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {election.title}
              </p>
            </div>
          </div>
        </main>

        <footer className="relative z-10 py-6 text-center border-t border-slate-200/50 bg-white">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CampusVote Hub</p>
        </footer>
      </div>
    );
  }

  // ── 3. Active ballot screen (live, has not voted) ──
  return (
    <div className="relative min-h-screen bg-[#f8fafc] flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/50 bg-white px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Campus<span className="text-blue-600">Vote</span>
              </span>
              <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-100/50 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Election
              </span>
            </div>
            <h1 className="text-xs font-semibold text-slate-500 mt-1 max-w-[200px] truncate">{election.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              title="Force Sync"
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer rounded-xl flex items-center justify-center shadow-xs bg-white"
              aria-label="Force Sync"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-900 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono">
              <Timer className="h-3.5 w-3.5 text-slate-500" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Ballot viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6 pt-6 pb-28 w-full">
        <div className="w-full max-w-xl md:max-w-4xl xl:max-w-6xl text-left space-y-6">
          
          {/* Metadata Subheader */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex flex-col gap-1.5 text-xs text-slate-500">
            <div>
              Position: <strong className="text-slate-800 font-bold">{getFriendlyElectionType(election.election_type)}</strong>
            </div>
            <div>
              Eligible Batch: <strong className="text-slate-800 font-bold">{election.eligible_batch}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Select ONE Candidate</h2>
            <p className="text-xs text-slate-400 leading-normal">
              Your vote is anonymous. Once submitted it cannot be changed.
            </p>
          </div>

          <form onSubmit={handleCastVoteClick} className="space-y-4">
            <div role="radiogroup" aria-label="Candidates" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {election.candidates?.map((candidate) => {
                const isSelected = selectedCandidateId === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setSelectedCandidateId(candidate.id);
                      }
                    }}
                    className={`cursor-pointer flex flex-col justify-between p-5 rounded-2xl border-2 transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600/20 text-center ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/20 shadow-xs"
                        : "border-slate-200/80 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      {/* Radio dot top right */}
                      <div className="w-full flex justify-end">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      {candidate.photo_url ? (
                        <img
                          src={candidate.photo_url}
                          alt={candidate.name}
                          className="h-20 w-20 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl border border-slate-200">
                          {candidate.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {candidate.name}
                        </h3>
                        {(candidate as any).roll_number && (
                          <p className="text-xs text-slate-400">Roll: {(candidate as any).roll_number}</p>
                        )}
                        {(candidate as any).department && (
                          <p className="text-xs text-slate-400">{(candidate as any).department}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom action panel */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-40 flex justify-center shadow-md">
              <button
                type="submit"
                disabled={!selectedCandidateId || isSubmitting}
                className="w-full max-w-xl py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed"
              >
                Cast My Vote
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Confirmation Dialog Overlay */}
      {showConfirm && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setShowConfirm(false)}
        >
          <div 
            className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">Confirm Vote</h2>
              <p className="text-xs text-slate-500 leading-normal">
                You are about to vote for:
              </p>
              <p className="text-sm font-bold text-blue-600 py-1.5 px-3 bg-blue-50/50 rounded-xl inline-block">
                {selectedCandidateName}
              </p>
              <p className="text-[11px] text-slate-400">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoaderScreen() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center font-sans">
      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
    </div>
  );
}

export default function StudentVotingPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const electionId = resolvedParams.id;

  return (
    <Suspense fallback={<LoaderScreen />}>
      <StudentVotingContent electionId={electionId} />
    </Suspense>
  );
}
