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

    const { error } = await supabase.rpc("submit_vote", {
      p_election_id: electionId,
      p_roll_number: formattedRoll,
      p_candidate_id: candidateId,
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

    const { data, error } = await supabase.rpc("has_already_voted", {
      p_election_id: electionId,
      p_roll_number: formattedRoll,
    });

    if (error) {
      throw new Error(`Failed to check voting status: ${error.message}`);
    }

    return data === true;
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

}
