import { supabase } from "@/lib/supabase";
import { VoteService } from "@/services/vote";

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
        throw new Error("DUPLICATE_ROLL_NUMBER");
      }
      throw new Error(`Failed to join waiting room: ${error.message}`);
    }
  }

  /**
   * Check if a student is currently in the waiting room
   */
  public static async isInWaitingRoom(electionId: string, rollNumber: string): Promise<boolean> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    const { data, error } = await supabase.rpc("is_in_waiting_room", {
      p_election_id: electionId,
      p_roll_number: formattedRoll,
    });

    if (error) {
      throw new Error(`Failed to check waiting room status: ${error.message}`);
    }

    return data === true;
  }

  /**
   * Remove a participant from the waiting room for a specific election
   */
  public static async removeParticipant(electionId: string, rollNumber: string): Promise<void> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    // 1. Verify if participant has already voted
    const voted = await VoteService.hasAlreadyVoted(electionId, formattedRoll);
    if (voted) {
      throw new Error("This participant has already voted and cannot be removed.");
    }

    // 2. Check election ownership (admin must own election)
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) {
      throw new Error("Permission denied: You must be logged in as an admin to remove participants.");
    }

    const { data: election, error: electionError } = await supabase
      .from("elections")
      .select("created_by")
      .eq("id", electionId)
      .single();

    if (electionError || !election) {
      throw new Error("Failed to verify election ownership.");
    }

    if (election.created_by !== userResponse.user.id) {
      throw new Error("Permission denied: You can only remove participants from elections you created.");
    }

    // 3. Remove ONLY that participant from waiting_room
    const { error: deleteError, count } = await supabase
      .from("waiting_room")
      .delete({ count: "exact" })
      .eq("election_id", electionId)
      .eq("roll_number", formattedRoll);

    if (deleteError) {
      throw new Error(`Failed to remove participant: ${deleteError.message}`);
    }

    if (count === 0) {
      throw new Error("Participant was already removed or is no longer in the waiting room.");
    }
  }
}

