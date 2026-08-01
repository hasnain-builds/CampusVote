import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ElectionStatus } from "@/types";
import { WaitingRoomService } from "@/services/waiting-room";

export function useWaitingRoom(electionId: string, studentRollNumber?: string) {
  const router = useRouter();
  const [participants, setParticipants] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [wasInWaitingRoom, setWasInWaitingRoom] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  // Keep ref of wasInWaitingRoom to avoid stale closure issues in realtime callback & intervals
  const wasInWaitingRoomRef = useRef(wasInWaitingRoom);
  useEffect(() => {
    wasInWaitingRoomRef.current = wasInWaitingRoom;
  }, [wasInWaitingRoom]);

  const forceSync = () => {
    setSyncTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!electionId) return;

    let isMounted = true;
    const formattedRoll = studentRollNumber?.trim().toUpperCase();

    // Helper to check if current student exists in waiting room (returns null on error)
    const checkPresence = async (): Promise<boolean | null> => {
      if (!formattedRoll) return null;
      try {
        return await WaitingRoomService.isInWaitingRoom(electionId, formattedRoll);
      } catch (err) {
        console.error("Error checking student presence:", err);
        return null;
      }
    };

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

        // Verify if student is already in waiting room (never triggers removal on initial load)
        if (formattedRoll) {
          const present = await checkPresence();
          if (present === true && isMounted) {
            setWasInWaitingRoom(true);
          }
        }

        // Fetch current participants (if authorized or available)
        const { data: voters, error: votersError } = await supabase
          .from("waiting_room")
          .select("roll_number")
          .eq("election_id", electionId)
          .order("joined_at", { ascending: true });

        if (!votersError && voters && isMounted) {
          const roster = voters.map((v) => v.roll_number);
          setParticipants(roster);
          setCount(roster.length);

          if (formattedRoll && roster.includes(formattedRoll)) {
            setWasInWaitingRoom(true);
          }
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

              if (formattedRoll && newVoter === formattedRoll) {
                setWasInWaitingRoom(true);
                setIsRemoved(false);
              }
            }
          } else if (payload.eventType === "DELETE") {
            // Refetch participants list if client has access
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

            // ONLY check for removal if student was previously confirmed in waiting room
            if (formattedRoll && wasInWaitingRoomRef.current) {
              const isSpecificRollDeleted = payload.old && (payload.old as any).roll_number === formattedRoll;
              if (isSpecificRollDeleted) {
                if (isMounted) setIsRemoved(true);
              } else {
                const stillPresent = await checkPresence();
                if (stillPresent === false && isMounted) {
                  setIsRemoved(true);
                }
              }
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
              router.replace(`/election/${electionId}/vote`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status for student waiting room election status (${electionId}):`, status);
      });

    // Backup polling check: ONLY check for removal if wasInWaitingRoom is ALREADY true
    let pollInterval: NodeJS.Timeout | null = null;
    if (formattedRoll) {
      pollInterval = setInterval(async () => {
        if (isMounted && wasInWaitingRoomRef.current) {
          const present = await checkPresence();
          if (present === false && isMounted) {
            console.log(`Student ${formattedRoll} confirmed removed from waiting room ${electionId}`);
            setIsRemoved(true);
          }
        }
      }, 4000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [electionId, studentRollNumber, router, syncTrigger]);

  return { participants, count, electionStatus, isLoading, wasInWaitingRoom, isRemoved, setWasInWaitingRoom, setIsRemoved, forceSync };
}


