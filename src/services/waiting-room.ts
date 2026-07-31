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
}
