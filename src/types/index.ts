export type ElectionStatus = 'draft' | 'live' | 'ended';
export type ElectionType = 'CR' | 'BR';

export interface Election {
  id: string;
  title: string;
  election_type: ElectionType;
  eligible_batch: string;
  join_code: string;
  status: ElectionStatus;
  created_at: string;
  duration_minutes: number;
  voting_started_at: string | null;
  end_time?: string | null;
  start_time?: string | null;
}

export interface Candidate {
  id: string;
  election_id: string;
  name: string;
  photo_url?: string | null;
  created_at: string;
}

export interface ElectionWithCandidates extends Election {
  candidates: Candidate[];
}

export interface CandidateResult {
  candidate_id: string;
  name: string;
  votes: number;
}
