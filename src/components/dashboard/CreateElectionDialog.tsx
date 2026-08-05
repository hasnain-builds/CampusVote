"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ElectionService } from "@/services/election";
import { ElectionWithCandidates, ElectionType } from "@/types";

interface CreateElectionDialogProps {
  onSuccess: (election: ElectionWithCandidates) => void;
}

interface CandidateInput {
  name: string;
}

export function CreateElectionDialog({ onSuccess }: CreateElectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<"CR" | "BR" | "OTHER">("CR");
  const [customPositionName, setCustomPositionName] = useState("");
  const [batch, setBatch] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    { name: "" },
    { name: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCandidate = () => {
    setCandidates((prev) => [...prev, { name: "" }]);
  };

  const handleRemoveCandidate = (index: number) => {
    if (candidates.length <= 2) {
      toast.error("An election must have at least 2 candidates.");
      return;
    }
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCandidateChange = (index: number, field: keyof CandidateInput, value: string) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalTitle = "";
    let finalElectionType: ElectionType = "CR";

    if (targetPosition === "CR") {
      finalTitle = "Class Representative";
      finalElectionType = "CR";
    } else if (targetPosition === "BR") {
      finalTitle = "Batch Representative";
      finalElectionType = "BR";
    } else if (targetPosition === "OTHER") {
      if (!customPositionName.trim()) {
        toast.error("Please enter a position name.");
        return;
      }
      finalTitle = customPositionName.trim();
      finalElectionType = "CR";
    }

    if (!batch.trim()) {
      toast.error("Please enter the eligible batch.");
      return;
    }

    // Validate candidates
    for (const c of candidates) {
      if (!c.name.trim()) {
        toast.error("All candidates must have a name.");
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating election...");

    try {
      const newElection = await ElectionService.createElection(
        finalTitle,
        finalElectionType,
        batch.trim(),
        durationMinutes,
        candidates.map((c) => ({
          name: c.name.trim(),
        }))
      );

      toast.success("Election created successfully!", { id: toastId });
      setOpen(false);
      
      // Reset form
      setTargetPosition("CR");
      setCustomPositionName("");
      setBatch("");
      setDurationMinutes(5);
      setCandidates([
        { name: "" },
        { name: "" },
      ]);
      
      onSuccess(newElection);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create election", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl px-6 py-2.5 transition-all duration-200 shadow-md shadow-blue-500/10">
          <Plus className="mr-2 h-4 w-4" /> Create Election
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:w-full max-w-xl h-auto max-h-[90vh] md:max-h-[85vh] overflow-hidden rounded-3xl p-0 border border-slate-100 flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between p-6 md:p-8 border-b border-slate-100 shrink-0 text-left">
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
            Create Live Election
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-left">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2 text-left min-w-0">
                  <Label htmlFor="electionType" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Target Position
                  </Label>
                  <Select
                    value={targetPosition}
                    onValueChange={(val) => setTargetPosition(val as "CR" | "BR" | "OTHER")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="electionType" className="bg-white rounded-xl border-slate-200 min-h-[48px] text-base w-full">
                      <SelectValue placeholder="Select Position" className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 bg-white">
                      <SelectItem value="CR" className="rounded-lg">Class Representative</SelectItem>
                      <SelectItem value="BR" className="rounded-lg">Batch Representative</SelectItem>
                      <SelectItem value="OTHER" className="rounded-lg">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2 min-w-0">
                  <Label htmlFor="batch" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Eligible Batch
                  </Label>
                  <Input                        
                    id="batch"
                    placeholder="e.g., Section-B"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="rounded-xl min-h-[48px] text-base"
                  />
                </div>
              </div>

              {targetPosition === "OTHER" && (
                <div className="grid grid-cols-1 gap-2 text-left">
                  <Label htmlFor="customPositionName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Position Name
                  </Label>
                  <Input
                    id="customPositionName"
                    placeholder="Enter position name"
                    value={customPositionName}
                    onChange={(e) => setCustomPositionName(e.target.value)}
                    required={targetPosition === "OTHER"}
                    disabled={isSubmitting}
                    className="rounded-xl min-h-[48px] text-base bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="duration" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Voting Duration
                </Label>
                <Select
                  value={durationMinutes.toString()}
                  onValueChange={(val) => setDurationMinutes(parseInt(val, 10))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="duration" className="bg-white rounded-xl border-slate-200 min-h-[48px] text-base w-full">
                    <SelectValue placeholder="Select Duration" className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 bg-white">
                    <SelectItem value="2" className="rounded-lg">2 minutes</SelectItem>
                    <SelectItem value="3" className="rounded-lg">3 minutes</SelectItem>
                    <SelectItem value="5" className="rounded-lg">5 minutes</SelectItem>
                    <SelectItem value="10" className="rounded-lg">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Candidates</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCandidate}
                  disabled={isSubmitting}
                  className="cursor-pointer text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl min-h-[36px]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Candidate
                </Button>
              </div>

              <div className="space-y-3">
                {candidates.map((c, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex-1">
                      <Input
                        placeholder={`Candidate #${index + 1} Name`}
                        value={c.name}
                        onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="bg-white rounded-xl border-slate-200 min-h-[48px] text-base"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCandidate(index)}
                      disabled={isSubmitting}
                      className="cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 md:p-8 border-t border-slate-100 bg-white shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer rounded-xl font-semibold min-h-[48px] px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 min-h-[48px]"
            >
              {isSubmitting ? "Creating..." : "Save & Launch"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
