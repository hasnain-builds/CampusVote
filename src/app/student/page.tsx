"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Vote, Loader2, RotateCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ElectionWithCandidates } from "@/types";
import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import { StudentJoinForm } from "@/components/waiting-room/StudentJoinForm";
import { WaitingRoomCard } from "@/components/waiting-room/WaitingRoomCard";
import { ElectionService } from "@/services/election";

function StudentHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<"JOIN" | "LOBBY">("JOIN");
  const [election, setElection] = useState<ElectionWithCandidates | null>(null);
  const [rollNumber, setRollNumber] = useState("");
  const [initialCode, setInitialCode] = useState("");
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedElectionId = localStorage.getItem("campusvote.electionId");
      const storedRollNumber = localStorage.getItem("campusvote.rollNumber");

      if (storedElectionId && storedRollNumber) {
        ElectionService.getElection(storedElectionId)
          .then((data) => {
            if (data.status === "live") {
              // Redirect straight to vote page
              router.replace(`/election/${storedElectionId}/vote`);
            } else if (data.status === "draft") {
              // Restore waiting room state
              setElection(data);
              setRollNumber(storedRollNumber);
              setStep("LOBBY");
              setIsLoadingSession(false);
            } else {
              // ended — show the join form for a new election
              // Do NOT clear localStorage — the vote page may still need it
              setIsLoadingSession(false);
            }
          })
          .catch((err) => {
            console.error("Failed to restore session election:", err);

            // Clear stale session
            localStorage.removeItem("campusvote.electionId");
            localStorage.removeItem("campusvote.rollNumber");

            setElection(null);
            setRollNumber("");
            setStep("JOIN");

            setIsLoadingSession(false);
          });
      } else {
        setIsLoadingSession(false);
      }
    }
  }, [router]);

  // Read code parameter from URL query string if present
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInitialCode(code);
    }
  }, [searchParams]);

  // Hook handles realtime updates and auto-routing to /election/[id]/vote when status transitions to LIVE
  const { participants, count, wasInWaitingRoom, isRemoved, setWasInWaitingRoom, setIsRemoved, forceSync } = useWaitingRoom(
    election?.id || "",
    rollNumber
  );

  // Handle student removal by administrator: ONLY if student was in waiting room
  useEffect(() => {
    if (isRemoved && wasInWaitingRoom && step === "LOBBY") {
      toast.error("You have been removed from this election by the administrator.");

      if (typeof window !== "undefined") {
        localStorage.removeItem("campusvote.electionId");
        localStorage.removeItem("campusvote.rollNumber");
      }

      setElection(null);
      setRollNumber("");
      setStep("JOIN");
    }
  }, [isRemoved, wasInWaitingRoom, step]);

  const handleJoinSuccess = (loadedElection: ElectionWithCandidates, roll: string) => {
    setIsRemoved(false);
    setWasInWaitingRoom(true);
    setElection(loadedElection);
    setRollNumber(roll);

    // Store credentials in localStorage
    localStorage.setItem("campusvote.rollNumber", roll);
    localStorage.setItem("campusvote.electionId", loadedElection.id);

    if (loadedElection.status === "live") {
      router.replace(`/election/${loadedElection.id}/vote`);
    } else {
      setStep("LOBBY");
    }
  };

  const handleForceSync = async () => {
    if (!election) return;
    const toastId = toast.loading("Syncing waiting room...");
    try {
      const data = await ElectionService.getElection(election.id);
      setElection(data);

      // Trigger hook to reconnect realtime and refetch participants
      forceSync();

      if (data.status === "live") {
        toast.success("Election is LIVE! Redirecting...", { id: toastId });
        router.replace(`/election/${data.id}/vote`);
      } else {
        toast.success("Synchronized successfully!", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync: " + err.message, { id: toastId });
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">Restoring session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-hidden font-sans">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">
                Back
              </span>
            </button> */}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20">
                <Vote className="h-5.5 w-5.5" />
              </div>

              <span className="text-xl font-bold tracking-tight text-slate-900">
                Campus<span className="text-blue-600">Vote</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {step === "LOBBY" && (
              <button
                onClick={handleForceSync}
                title="Force Sync"
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer rounded-xl flex items-center justify-center shadow-xs"
                aria-label="Force Sync"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}


          </div>
        </div>
      </header>

      {/* Main card viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-[24px] sm:rounded-[32px] p-6 sm:p-10 shadow-xl shadow-slate-100/50 text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />

          {step === "JOIN" ? (
            <StudentJoinForm
              initialCode={initialCode}
              onJoinSuccess={handleJoinSuccess}
            />
          ) : (
            <WaitingRoomCard
              election={election!}
              rollNumber={rollNumber}
              participants={participants}
              count={count}
            />
          )}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center border-t border-slate-200/50 bg-white/40">
        <p className="text-xs font-medium text-slate-400">
          CampusVote Hub
        </p>
      </footer>
    </div>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex justify-center items-center font-sans">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    }>
      <StudentHubContent />
    </Suspense>
  );
}
