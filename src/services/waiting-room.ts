import { supabase } from "@/lib/supabase";

export class WaitingRoomService {
  /**
   * Add a student to the waiting room for a given election
   */
  public static async joinElection(electionId: string, rollNumber: string): Promise<void> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    const { error } = await supabase
      .from("waiting_room")
      .insert({
        election_id: electionId,
        roll_number: formattedRoll,
      });

    if (error) {
      if (error.code === "23505") {
        throw new Error("This roll number is already in the waiting room.");
      }
      throw new Error(`Failed to join waiting room: ${error.message}`);
    }
  }

  /**
   * Remove a student from the waiting room
   */
  public static async leaveElection(electionId: string, rollNumber: string): Promise<void> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    const { error } = await supabase
      .from("waiting_room")
      .delete()
      .eq("election_id", electionId)
      .eq("roll_number", formattedRoll);

    if (error) {
      throw new Error(`Failed to leave waiting room: ${error.message}`);
    }
  }

  /**
   * Fetch current waiting room participant count
   */
  public static async getParticipantCount(electionId: string): Promise<number> {
    const { count, error } = await supabase
      .from("waiting_room")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    if (error) {
      throw new Error(`Failed to get participant count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Subscribe to waiting room updates in real time
   */
  public static subscribeParticipants(
    electionId: string,
    onUpdate: (payload: any) => void
  ) {
    return supabase
      .channel(`waiting_room_events:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiting_room",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
  }
}
