import { useState, useEffect } from "react";
import { VoteService } from "@/services/vote";
import { supabase } from "@/lib/supabase";

export function useVoting(electionId: string, rollNumber: string) {
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!electionId || !rollNumber) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function checkStatus() {
      try {
        const voted = await VoteService.hasAlreadyVoted(electionId, rollNumber);
        if (isMounted) {
          setHasVoted(voted);
        }
      } catch (err) {
        console.error("Error in useVoting checkStatus:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    // Subscribe to realtime vote updates for this student (in case they submit from another session)
    const channel = VoteService.subscribeVotes(electionId, async () => {
      try {
        const voted = await VoteService.hasAlreadyVoted(electionId, rollNumber);
        if (isMounted) {
          setHasVoted(voted);
        }
      } catch (err) {
        console.error("Realtime vote sync error:", err);
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [electionId, rollNumber]);

  const submitVote = async (candidateId: string) => {
    if (hasVoted) throw new Error("You have already voted.");
    setIsSubmitting(true);
    try {
      await VoteService.submitVote(electionId, rollNumber, candidateId);
      setHasVoted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    hasVoted,
    isLoading,
    isSubmitting,
    submitVote,
  };
}
