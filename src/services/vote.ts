import { supabase } from "@/lib/supabase";

export class VoteService {
  /**
   * Submit a student's vote for a candidate in an election
   */
  public static async submitVote(
    electionId: string,
    rollNumber: string,
    candidateId: string
  ): Promise<void> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    const { error } = await supabase
      .from("votes")
      .insert({
        election_id: electionId,
        roll_number: formattedRoll,
        candidate_id: candidateId,
      });

    if (error) {
      if (error.code === "23505") {
        throw new Error("You have already voted in this election.");
      }
      if (error.code === "23503") {
        throw new Error("The selected candidate is no longer available.");
      }
      throw new Error(`Failed to submit vote: ${error.message}`);
    }
  }

  /**
   * Check if a student roll number has already voted in this election
   */
  public static async hasAlreadyVoted(
    electionId: string,
    rollNumber: string
  ): Promise<boolean> {
    const formattedRoll = rollNumber.trim().toUpperCase();

    const { data, error } = await supabase
      .from("votes")
      .select("id")
      .eq("election_id", electionId)
      .eq("roll_number", formattedRoll)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check voting status: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Subscribe to voting updates in real time
   */
  public static subscribeVotes(electionId: string, onVote: () => void) {
    return supabase
      .channel(`votes_tracker:${electionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `election_id=eq.${electionId}`,
        },
        () => {
          onVote();
        }
      )
      .subscribe();
  }

  /**
   * Get total vote count cast in an election
   */
  public static async getVoteCount(electionId: string): Promise<number> {
    const { count, error } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    if (error) {
      throw new Error(`Failed to get vote count: ${error.message}`);
    }

    return count || 0;
  }
}
