import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ElectionService } from "@/services/election";
import { ElectionWithCandidates, ElectionStatus } from "@/types";

/**
 * Single reusable hook for election state + realtime synchronization.
 *
 * Both Admin and Student MUST consume this same hook.
 * It is the ONLY place that subscribes to elections table updates.
 *
 * On mount:
 *   1. Fetches election with candidates from the database.
 *   2. Subscribes to postgres_changes UPDATE on the elections table.
 *
 * On realtime update:
 *   Merges ALL changed fields (status, voting_started_at, end_time, start_time,
 *   duration_minutes) into the local election state.
 *
 * refetch():
 *   Performs a full database fetch and overwrites local state completely.
 *   Increments an internal trigger so the realtime channel is torn down and
 *   re-subscribed (full reconnection).
 */
export function useRealtimeElection(electionId: string) {
  const [election, setElection] = useState<ElectionWithCandidates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [channelTrigger, setChannelTrigger] = useState(0);

  // Full database fetch — called on mount and on refetch()
  const fetchElection = useCallback(async () => {
    if (!electionId) return;
    try {
      const data = await ElectionService.getElection(electionId);
      setElection(data);
    } catch (err) {
      console.error("[useRealtimeElection] Failed to fetch election:", err);
    } finally {
      setIsLoading(false);
    }
  }, [electionId]);

  // Public refetch: full DB fetch + channel reconnect
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchElection();
    // Increment trigger to force the realtime channel useEffect to
    // tear down the old subscription and create a fresh one.
    setChannelTrigger((prev) => prev + 1);
  }, [fetchElection]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchElection();
  }, [fetchElection]);

  // Realtime subscription — one single channel for this election
  useEffect(() => {
    if (!electionId) return;

    const channel = supabase
      .channel(`realtime_election:${electionId}:${channelTrigger}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "elections",
          filter: `id=eq.${electionId}`,
        },
        (payload) => {
          if (!payload.new) return;
          console.log("[useRealtimeElection] Realtime UPDATE received:", payload.new);

          setElection((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              status: (payload.new.status as ElectionStatus) ?? prev.status,
              voting_started_at: payload.new.voting_started_at ?? prev.voting_started_at,
              start_time: payload.new.start_time ?? prev.start_time,
              end_time: payload.new.end_time ?? prev.end_time,
              duration_minutes: payload.new.duration_minutes ?? prev.duration_minutes,
            };
          });
        }
      )
      .subscribe((status) => {
        console.log(`[useRealtimeElection] Channel status (${electionId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [electionId, channelTrigger]);

  return { election, isLoading, refetch };
}
