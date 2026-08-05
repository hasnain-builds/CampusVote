"use client";

import React from "react";
import Link from "next/link";
import { Vote, Users, Calendar, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ElectionWithCandidates } from "@/types";
import { ElectionService } from "@/services/election";
import { Button } from "@/components/ui/button";
import { getFriendlyElectionType } from "@/utils/election";

interface ElectionListProps {
  elections: ElectionWithCandidates[];
  onDeleteSuccess: () => void;
}

export function ElectionList({ elections, onDeleteSuccess }: ElectionListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "draft":
        return "bg-amber-50 text-amber-700 border border-amber-100";
      case "ended":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-100";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "live":
        return "Voting Live";
      case "draft":
        return "Lobby Open";
      case "ended":
        return "Completed";
      default:
        return "Waiting";
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to election detail
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this election? This will delete all candidate and vote data.")) {
      return;
    }

    const toastId = toast.loading("Deleting election...");
    try {
      await ElectionService.deleteElection(id);
      toast.success("Election deleted successfully.", { id: toastId });
      onDeleteSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete election", { id: toastId });
    }
  };

  if (elections.length === 0) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-12 text-center shadow-xs">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 border border-blue-100/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Vote className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No elections scheduled</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
          Create your first election using the button above to generate a join code and QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {elections.map((election) => (
        <Link
          key={election.id}
          href={`/admin-dashboard/election/${election.id}`}
          className="group block bg-white border border-slate-200/60 rounded-[28px] p-6 shadow-sm hover:border-blue-400/50 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 relative text-left"
        >
          <div className="flex flex-col h-full justify-between gap-6">
            {/* Header info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full ${getStatusColor(election.status)}`}>
                  {getStatusLabel(election.status)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                  #{election.join_code}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                  {election.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Position: {getFriendlyElectionType(election.election_type, election.title)}
                </p>
              </div>
            </div>

            {/* Middle Metadata */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                <span>Batch: {election.eligible_batch}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{new Date(election.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions / Footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(election.id, e)}
                className="cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
              
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:gap-1.5 transition-all">
                Control panel
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
