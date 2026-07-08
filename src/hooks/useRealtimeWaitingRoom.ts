import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimeWaitingRoom(electionId: string, syncTrigger: number = 0) {
  const [voters, setVoters] = useState<string[]>([]);

  useEffect(() => {
    if (!electionId) return;

    // Fetch initial waiting room roster
    async function fetchInitialVoters() {
      const { data, error } = await supabase
        .from("waiting_room")
        .select("roll_number")
        .eq("election_id", electionId)
        .order("joined_at", { ascending: false });

      if (error) {
        console.error("Error fetching waiting room:", error.message);
        return;
      }

      setVoters(data.map((v) => v.roll_number));
    }

    fetchInitialVoters();

    // Subscribe to realtime waiting room changes
    const channel = supabase
      .channel(`waiting_room_admin:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiting_room",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          console.log("Realtime event received in useRealtimeWaitingRoom:", payload);
          if (payload.eventType === "INSERT") {
            const newVoter = payload.new.roll_number;
            setVoters((prev) => {
              if (prev.includes(newVoter)) return prev;
              return [newVoter, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            // If REPLICA IDENTITY FULL is enabled, we get the roll_number directly in payload.old
            if (payload.old && (payload.old as any).roll_number) {
              const deletedRoll = (payload.old as any).roll_number;
              setVoters((prev) => prev.filter((v) => v !== deletedRoll));
            } else {
              // Fallback to refetching on delete
              fetchInitialVoters();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status for admin waiting room (${electionId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [electionId, syncTrigger]);

  return { voters, count: voters.length };
}
