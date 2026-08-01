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
import { AlertCircle } from "lucide-react";

interface DuplicateRollDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rollNumber?: string;
}

export function DuplicateRollDialog({
  isOpen,
  onOpenChange,
  rollNumber,
}: DuplicateRollDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-slate-900">
                Roll Number Already Exists
              </DialogTitle>
              {rollNumber && (
                <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block mt-0.5">
                  Roll: {rollNumber}
                </span>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1 space-y-1">
            <span>This roll number has already joined this waiting room.</span>
            <br />
            <span>If you believe this is a mistake, please contact the election administrator.</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer px-6"
          >
            Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
