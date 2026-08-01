"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, StopCircle, Award, Users, Vote, Timer, QrCode, Loader2, Clock, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { ElectionService } from "@/services/election";
import { WaitingRoomService } from "@/services/waiting-room";
import { ElectionStatus } from "@/types";
import { getFriendlyElectionType } from "@/utils/election";
import { formatTime, parseUTCDate } from "@/utils/countdown";
import { useRealtimeElection } from "@/hooks/useRealtimeElection";
import { useRealtimeWaitingRoom } from "@/hooks/useRealtimeWaitingRoom";
import { useRealtimeVotes } from "@/hooks/useRealtimeVotes";
import { JoinQRCode } from "@/components/qr/JoinQRCode";
import { CreateElectionDialog } from "@/components/dashboard/CreateElectionDialog";
import { RemoveParticipantDialog } from "@/components/dashboard/RemoveParticipantDialog";

interface ElectionControllerProps {
  electionId: string;
}

export function ElectionController({ electionId }: ElectionControllerProps) {
  const router = useRouter();

  // ── Single source of truth for election state ──
  const { election, isLoading, refetch } = useRealtimeElection(electionId);

  // ── Auxiliary local state ──
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [origin, setOrigin] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  // ── Remove Participant state ──
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleOpenRemoveDialog = (roll: string) => {
    setSelectedRoll(roll);
    setIsRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedRoll || !electionId) return;

    setIsRemoving(true);
    try {
      await WaitingRoomService.removeParticipant(electionId, selectedRoll);
      toast.success("Participant removed successfully.");
      setIsRemoveDialogOpen(false);
      setSelectedRoll(null);
      setSyncTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Remove participant error:", err);
      toast.error(err.message || "Failed to remove participant.");
      setIsRemoveDialogOpen(false);
    } finally {
      setIsRemoving(false);
    }
  };

  // Get window location on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // ── Countdown timer and Auto-End — driven entirely by election.end_time ──
  useEffect(() => {
    if (!election) return;

    if (election.status === "draft") {
      // Show configured duration as preview
      setTimeLeft(election.duration_minutes * 60);
      return;
    }

    if (election.status === "ended") {
      setTimeLeft(0);
      return;
    }

    // status === "live" — tick every second using end_time
    const tick = () => {
      const now = new Date();
      
      const parsedEnd = parseUTCDate(election.end_time);
      if (!parsedEnd) {
        console.error("[Timer Error] end_time is null/missing/invalid for live election", {
          currentTime: now.toISOString(),
          voting_started_at: election.voting_started_at,
          end_time: election.end_time
        });
        toast.error("Critical: end_time is missing! Keeping election live.");
        return;
      }

      const t = parsedEnd.getTime();
      const remaining = Math.max(0, Math.floor((t - now.getTime()) / 1000));
      setTimeLeft(remaining);

      // Temporary debug logs
      console.log("[Timer Debug Tick]", {
        currentTime: now.toISOString(),
        voting_started_at: election.voting_started_at,
        end_time: election.end_time,
        remainingTime: remaining
      });

      if (remaining <= 0) {
        // Double check using parsed UTC times and safety guard
        const parsedStart = parseUTCDate(election.voting_started_at);
        const startedTime = parsedStart ? parsedStart.getTime() : 0;
        const secondsSinceStart = Math.floor((now.getTime() - startedTime) / 1000);

        // Safety: If started less than 10 seconds ago, do not auto-end.
        if (secondsSinceStart <= 10) {
          console.warn("[Timer Debug] Safety guard triggered: election was started recently. Postponing auto-end.", {
            secondsSinceStart,
            remaining
          });
          return;
        }

        const reasonStr = `Countdown reached exactly zero (remaining: ${remaining}s, secondsSinceStart: ${secondsSinceStart}s)`;
        console.log("[Timer Debug] Automatically ending election", {
          currentTime: now.toISOString(),
          voting_started_at: election.voting_started_at,
          end_time: election.end_time,
          remainingTime: remaining,
          reason: reasonStr
        });
        handleUpdateStatus("ended", reasonStr);
      }
    };

    tick(); // initial tick

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [election?.status, election?.end_time, election?.duration_minutes]);

  // ── Realtime hooks for waiting room & votes ──
  const { voters: waitingRoomVoters, count: waitingRoomCount } = useRealtimeWaitingRoom(electionId, syncTrigger);
  const { results: voteResults, totalVotes } = useRealtimeVotes(electionId, syncTrigger);

  // ── Force Sync — full state refresh ──
  const handleForceSync = async () => {
    const toastId = toast.loading("Syncing...");
    try {
      await refetch();
      setSyncTrigger((prev) => prev + 1);
      toast.success("Synchronized successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync: " + err.message, { id: toastId });
    }
  };

  // ── Status transition ──
  const handleUpdateStatus = async (newStatus: ElectionStatus, reason?: string) => {
    if (!election) return;

    const toastId = toast.loading("Transition State...");
    try {
      await ElectionService.updateElectionStatus(electionId, newStatus, reason);
      // Refetch to get the exact server-written timestamps (end_time, start_time, etc.)
      await refetch();
      toast.success(`Election state updated to ${newStatus}`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update election status", { id: toastId });
    }
  };

  // ── Derived state ──
  const status = election?.status || "draft";

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="py-32 flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold text-slate-800">Election Not Found</h3>
        <p className="text-sm text-slate-400 mt-2">The requested election details could not be loaded.</p>
        <Link href="/admin-dashboard" className="text-blue-600 hover:underline mt-4 inline-block font-semibold">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const joinUrl = `${origin}/student?code=${election.join_code}`;
  
  // Calculate winner if completed
  const sortedWinners = [...voteResults].sort((a, b) => b.votes - a.votes);
  const winner = sortedWinners[0];
  const isTied = sortedWinners.length > 1 && sortedWinners[0].votes === sortedWinners[1].votes && sortedWinners[0].votes > 0;

  // Calculate statistics metrics
  const pendingVotes = Math.max(0, waitingRoomCount - totalVotes);
  const progressPercent = waitingRoomCount > 0 ? Math.round((totalVotes / waitingRoomCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Back to Dashboard and Title Header */}
      <div className="flex flex-col gap-3 text-left">
        <Link
          href="/admin-dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex justify-between items-start w-full">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{election.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Position: <strong className="text-slate-700">{getFriendlyElectionType(election.election_type)}</strong> | Eligible Batch: <strong className="text-slate-700">{election.eligible_batch}</strong>
            </p>
          </div>
          
          <button
            onClick={handleForceSync}
            title="Force Sync"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer rounded-xl flex items-center justify-center shadow-xs"
            aria-label="Force Sync"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {/* Participants Joined */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-32 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Participants Joined
          </span>
          <div className="flex flex-col mt-2">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {waitingRoomCount}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-blue-500" /> Total students joined
            </span>
          </div>
        </div>

        {/* Votes Submitted */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-32 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Votes Submitted
          </span>
          <div className="flex flex-col mt-2">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {totalVotes}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
              <Vote className="h-3.5 w-3.5 text-emerald-500" /> Ballots submitted
            </span>
          </div>
        </div>

        {/* Participants Remaining */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-32 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Participants Remaining
          </span>
          <div className="flex flex-col mt-2">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {pendingVotes}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Remaining to vote
            </span>
          </div>
        </div>

        {/* Current Turnout */}
        <div className="bg-white border border-slate-200/60 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-32 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Current Turnout
          </span>
          <div className="flex flex-col mt-2 w-full">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {progressPercent}%
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                {totalVotes}/{waitingRoomCount} Cast
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main split display: Control Panels / QR & Join */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Live Feed OR Results */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          {status !== "ended" ? (
            <div className="bg-white border border-slate-200/60 rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Live Participants</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Students who have joined the waiting room lobby.</p>
                </div>
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  {waitingRoomCount} Joined
                </span>
              </div>

              {waitingRoomVoters.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400">No students joined yet.</p>
                  <p className="text-xs text-slate-400/80 mt-1">Project the join code or QR code on the right for students to join.</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 divide-y divide-slate-100">
                  {waitingRoomVoters.map((roll, index) => (
                    <div
                      key={index}
                      onClick={() => handleOpenRemoveDialog(roll)}
                      title="Click to remove participant"
                      className="flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-red-50/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 tracking-wide">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        <span className="font-mono text-slate-800 group-hover:text-red-700 transition-colors">{roll}</span>
                        <span className="text-slate-400 font-normal group-hover:text-red-500/80 transition-colors">joined the room</span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-all bg-white px-2.5 py-1 rounded-lg border border-red-100 shadow-xs">
                        Remove Participant
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Final Election Results
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Final vote distribution across candidates.</p>
                </div>
                <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">
                  {totalVotes} Votes Cast
                </span>
              </div>

              <div className="space-y-6">
                {voteResults.map((result) => {
                  const percentage = totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0;
                  const isWinning = winner && result.candidate_id === winner.candidate_id && winner.votes > 0 && !isTied;
                  return (
                    <div key={result.candidate_id} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-slate-800">{result.name}</span>
                          {isWinning && <span className="text-xs">🏆</span>}
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {result.votes} {result.votes === 1 ? "vote" : "votes"} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinning ? "bg-amber-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {winner && winner.votes > 0 && (
                <div className="mt-8 p-6 bg-amber-500/10 border border-amber-200/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Election Winner</span>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        {isTied ? "TIE ELECTION" : winner.name}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-xs font-extrabold text-amber-800">
                      {isTied ? "Tie Count" : `${winner.votes} Votes`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: QR Code, Join Code, Status, Timer & Controls */}
        <div className="order-1 lg:order-2 space-y-6">
          {/* Action Buttons & Status Card */}
          <div className="bg-white border border-slate-200/60 rounded-[24px] md:rounded-[32px] p-6 shadow-sm text-left space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status
                </span>
                <span className={`text-base font-black uppercase tracking-wide leading-none ${
                  status === "live" ? "text-emerald-600" : status === "draft" ? "text-amber-500" : "text-slate-500"
                }`}>
                  {status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Candidates
                </span>
                <span className="text-base font-black text-slate-900 leading-none">
                  {election.candidates?.length || 0}
                </span>
              </div>
            </div>

            {/* Timer Display Box */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50">
                <Timer className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {status === "draft" ? "Duration" : status === "live" ? "Time Remaining" : "Time Elapsed"}
                </span>
                <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Status controls */}
            <div className="space-y-3">
              {status === "draft" && (
                <button
                  onClick={() => handleUpdateStatus("live")}
                  className="cursor-pointer group flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all duration-200 shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  <Play className="h-4 w-4" /> Start Voting
                </button>
              )}

              {status === "live" && (
                <button
                  onClick={() => handleUpdateStatus("ended")}
                  className="cursor-pointer group flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all duration-200 shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20"
                >
                  <StopCircle className="h-4 w-4" /> End Voting
                </button>
              )}

              {status === "ended" && (
                <div className="space-y-3">
                  <div className="text-center py-2.5 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    Election Ended
                  </div>
                  <CreateElectionDialog onSuccess={(newElection) => router.push(`/admin-dashboard/election/${newElection.id}`)} />
                </div>
              )}
            </div>
          </div>

          {/* QR Code and Join Code Box */}
          {status !== "ended" && (
            <div className="bg-white border border-slate-200/60 rounded-[24px] md:rounded-[32px] p-6 shadow-sm text-center space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Join Code</span>
                <div className="text-4xl font-black text-slate-900 tracking-wider font-mono">
                  {election.join_code}
                </div>
              </div>

              {origin && (
                <div className="space-y-4">
                  <JoinQRCode value={joinUrl} size={200} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                      <QrCode className="h-3.5 w-3.5" /> Scan QR to Join
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={joinUrl}
                      onClick={(e) => {
                        (e.target as any).select();
                        navigator.clipboard.writeText(joinUrl);
                        toast.success("Link copied to clipboard!");
                      }}
                      className="w-full text-center text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[10px] font-semibold truncate cursor-pointer hover:bg-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remove Participant Confirmation Dialog */}
      <RemoveParticipantDialog
        isOpen={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        rollNumber={selectedRoll || ""}
        onConfirm={handleConfirmRemove}
        isRemoving={isRemoving}
      />
    </div>
  );
}
