import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CandidateResult } from "@/types";

export function useRealtimeVotes(electionId: string, syncTrigger: number = 0) {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    if (!electionId) return;

    // Fetch candidates and current votes
    async function fetchInitialResults() {
      try {
        const { data: candidates, error: candError } = await supabase
          .from("candidates")
          .select("id, name")
          .eq("election_id", electionId);

        if (candError || !candidates) {
          console.error("Error fetching candidates for hook:", candError?.message);
          return;
        }

        const { data: votes, error: votesError } = await supabase
          .from("votes")
          .select("candidate_id")
          .eq("election_id", electionId);

        if (votesError) {
          console.error("Error fetching votes for hook:", votesError.message);
          return;
        }

        const voteMap = (votes || []).reduce((acc: Record<string, number>, vote) => {
          acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
          return acc;
        }, {});

        const candidateResults = candidates.map((c) => ({
          candidate_id: c.id,
          name: c.name,
          votes: voteMap[c.id] || 0,
        })).sort((a, b) => b.votes - a.votes);

        setResults(candidateResults);
        setTotalVotes(votes?.length || 0);
      } catch (err) {
        console.error("Failed to load initial results:", err);
      }
    }

    fetchInitialResults();

    // Subscribe to votes insert events
    const channel = supabase
      .channel(`votes:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          const newVoteCandidateId = payload.new.candidate_id;
          setResults((prev) => {
            const updated = prev.map((item) => {
              if (item.candidate_id === newVoteCandidateId) {
                return { ...item, votes: item.votes + 1 };
              }
              return item;
            });
            return [...updated].sort((a, b) => b.votes - a.votes);
          });
          setTotalVotes((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [electionId, syncTrigger]);

  return { results, totalVotes };
}
