import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ElectionStatus } from "@/types";

export function useWaitingRoom(electionId: string) {
  const router = useRouter();
  const [participants, setParticipants] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const forceSync = () => {
    setSyncTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!electionId) return;

    let isMounted = true;

    async function initLobby() {
      try {
        // Fetch current election status
        const { data: election, error: electionError } = await supabase
          .from("elections")
          .select("status")
          .eq("id", electionId)
          .single();

        if (electionError) throw electionError;
        if (isMounted) {
          setElectionStatus(election.status as ElectionStatus);
        }

        if (election.status === "live") {
          router.replace(`/election/${electionId}/vote`);
          return;
        }

        // Fetch current participants
        const { data: voters, error: votersError } = await supabase
          .from("waiting_room")
          .select("roll_number")
          .eq("election_id", electionId)
          .order("joined_at", { ascending: true });

        if (votersError) throw votersError;
        if (isMounted) {
          const roster = voters.map((v) => v.roll_number);
          setParticipants(roster);
          setCount(roster.length);
        }
      } catch (err) {
        console.error("useWaitingRoom initialization error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initLobby();

    // Set up realtime channel for waiting_room updates
    const roomChannel = supabase
      .channel(`waiting_room_student_list:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiting_room",
          filter: `election_id=eq.${electionId}`,
        },
        async (payload) => {
          console.log("Realtime event received in useWaitingRoom (waiting_room):", payload);
          if (payload.eventType === "INSERT") {
            const newVoter = payload.new.roll_number;
            if (isMounted) {
              setParticipants((prev) => {
                if (prev.includes(newVoter)) return prev;
                return [...prev, newVoter];
              });
              setCount((prev) => prev + 1);
            }
          } else if (payload.eventType === "DELETE") {
            // Re-fetch is the safest way to maintain exact state after deletes
            const { data } = await supabase
              .from("waiting_room")
              .select("roll_number")
              .eq("election_id", electionId)
              .order("joined_at", { ascending: true });
            
            if (data && isMounted) {
              const roster = data.map((v) => v.roll_number);
              setParticipants(roster);
              setCount(roster.length);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status for student waiting room list (${electionId}):`, status);
      });

    // Set up realtime channel for election status updates
    const statusChannel = supabase
      .channel(`waiting_room_student_status:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "elections",
          filter: `id=eq.${electionId}`,
        },
        (payload) => {
          console.log("Realtime event received in useWaitingRoom (elections):", payload);
          if (payload.new && payload.new.status && isMounted) {
            const nextStatus = payload.new.status as ElectionStatus;
            setElectionStatus(nextStatus);
            
            if (nextStatus === "live") {
              // Redirect connected student automatically to /election/[id]/vote
              router.replace(`/election/${electionId}/vote`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status for student waiting room election status (${electionId}):`, status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [electionId, router, syncTrigger]);

  return { participants, count, electionStatus, isLoading, forceSync };
}
