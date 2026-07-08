import { supabase } from "@/lib/supabase";
import { ElectionWithCandidates, ElectionStatus, CandidateResult, ElectionType } from "@/types";

export class ElectionService {
  /**
   * Helper to generate a unique 6-digit join code
   */
  private static generateJoinCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new election and insert its candidates
   */
  public static async createElection(
    title: string,
    electionType: ElectionType,
    batch: string,
    durationMinutes: number,
    candidates: { name: string; photo_url?: string }[]
  ): Promise<ElectionWithCandidates> {
    const code = this.generateJoinCode();
    
    const payload = {
      title,
      election_type: electionType,
      eligible_batch: batch,
      join_code: code,
      status: "draft",
      duration_minutes: durationMinutes,
    };
    console.log("Inserting election payload:", payload);

    // 1. Insert election record
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .insert(payload)
      .select()
      .single();

    if (electionError || !election) {
      throw new Error(`Failed to create election: ${electionError?.message}`);
    }

    // 2. Insert candidates
    const candidatesData = candidates.map((cand) => ({
      election_id: election.id,
      name: cand.name,
      photo_url: cand.photo_url || null,
    }));

    const { data: insertedCandidates, error: candidatesError } = await supabase
      .from("candidates")
      .insert(candidatesData)
      .select();

    if (candidatesError) {
      // Cleanup election on failure
      await supabase.from("elections").delete().eq("id", election.id);
      throw new Error(`Failed to insert candidates: ${candidatesError.message}`);
    }

    return {
      ...election,
      candidates: insertedCandidates || [],
    };
  }

  /**
   * Fetch all elections
   */
  public static async getAllElections(): Promise<ElectionWithCandidates[]> {
    const { data: elections, error: electionsError } = await supabase
      .from("elections")
      .select("*, candidates(*)")
      .order("created_at", { ascending: false });

    if (electionsError) {
      throw new Error(`Failed to fetch elections: ${electionsError.message}`);
    }

    return elections || [];
  }

  /**
   * Fetch a specific election by ID with candidates
   */
  public static async getElection(id: string): Promise<ElectionWithCandidates> {
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .select("*, candidates(*)")
      .eq("id", id)
      .single();

    if (electionError || !election) {
      throw new Error(`Election not found: ${electionError?.message}`);
    }

    return election;
  }

  /**
   * Fetch a specific election by its 6-digit Join Code
   */
  public static async getElectionByJoinCode(code: string): Promise<ElectionWithCandidates> {
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .select("*, candidates(*)")
      .eq("join_code", code)
      .single();

    if (electionError || !election) {
      throw new Error(`Election with code ${code} not found.`);
    }

    return election;
  }

  /**
   * Update election status.
   * If transitioning to LIVE (start voting), automatically delete all waiting_room records.
   */
  public static async updateElectionStatus(id: string, status: ElectionStatus, reason?: string): Promise<void> {
    // Fetch previous status and other details for logging
    const { data: oldElection } = await supabase
      .from("elections")
      .select("status, voting_started_at, end_time, duration_minutes")
      .eq("id", id)
      .single();

    const previousStatus = oldElection?.status || "unknown";
    const duration = Number(oldElection?.duration_minutes) || 5;
    const now = new Date();
    
    let votingStartedAt = oldElection?.voting_started_at;
    let endTime = oldElection?.end_time;

    const updateData: any = { status };
    if (status === "live") {
      votingStartedAt = now.toISOString();
      endTime = new Date(now.getTime() + duration * 60 * 1000).toISOString();
      
      updateData.voting_started_at = votingStartedAt;
      updateData.start_time = votingStartedAt;
      updateData.end_time = endTime;
    }

    const remainingSecs = endTime ? Math.max(0, Math.floor((new Date(endTime).getTime() - now.getTime()) / 1000)) : 0;
    const stackTrace = new Error().stack || "";

    console.log("--------------------------------");
    console.log("Election Transition");
    console.log("File: src/services/election.ts");
    console.log("Function: updateElectionStatus()");
    console.log("Previous:", previousStatus);
    console.log("New:", status);
    console.log("Current Time:", now.toISOString());
    console.log("Voting Started:", votingStartedAt || "null");
    console.log("End Time:", endTime || "null");
    console.log("Remaining:", remainingSecs);
    console.log("Stack Trace:\n", stackTrace);
    console.log("--------------------------------");

    if (status === "ended") {
      console.log("WHO called updateElectionStatus(\"ended\")");
      console.log("Reason:", reason || "N/A");
      console.log("Stack Trace:\n", stackTrace);
      console.log("--------------------------------");
    }

    const { error } = await supabase
      .from("elections")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Get vote counts for all candidates in an election
   */
  public static async getElectionResults(electionId: string): Promise<CandidateResult[]> {
    // 1. Fetch candidates first
    const { data: candidates, error: candError } = await supabase
      .from("candidates")
      .select("id, name")
      .eq("election_id", electionId);

    if (candError || !candidates) {
      throw new Error(`Failed to fetch candidates for results: ${candError?.message}`);
    }

    // 2. Fetch vote counts grouped by candidate
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("candidate_id")
      .eq("election_id", electionId);

    if (votesError) {
      throw new Error(`Failed to fetch votes for results: ${votesError.message}`);
    }

    // 3. Map votes to candidates
    const voteMap = (votes || []).reduce((acc: Record<string, number>, vote) => {
      acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
      return acc;
    }, {});

    return candidates.map((c) => ({
      candidate_id: c.id,
      name: c.name,
      votes: voteMap[c.id] || 0,
    })).sort((a, b) => b.votes - a.votes);
  }

  /**
   * Delete an election completely (cascades to candidates, waiting_room, votes)
   */
  public static async deleteElection(id: string): Promise<void> {
    const { error } = await supabase.from("elections").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete election: ${error.message}`);
    }
  }
}
