"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserMinus, Loader2 } from "lucide-react";

interface RemoveParticipantDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rollNumber: string;
  onConfirm: () => Promise<void>;
  isRemoving?: boolean;
}

export function RemoveParticipantDialog({
  isOpen,
  onOpenChange,
  rollNumber,
  onConfirm,
  isRemoving = false,
}: RemoveParticipantDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <UserMinus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Remove Participant
              </DialogTitle>
              <span className="text-xs font-mono font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100/60 inline-block mt-1">
                {rollNumber}
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-2">
            This participant will be removed from the waiting room.
            <br />
            They will no longer be able to continue in this election unless they join again.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
            className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className="w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-500/10 cursor-pointer flex items-center justify-center gap-2"
          >
            {isRemoving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Participant"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
