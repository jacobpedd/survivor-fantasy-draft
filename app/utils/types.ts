/**
 * Types for the Survivor Fantasy Draft app
 * These are used for type-safe access to KV storage
 */

// User type
export interface User {
  name: string;
  joinedAt?: number;
}

// Draft pick type - represents a single pick in a draft round
export interface DraftPick {
  userName: string;     // Name of the user making the pick
  contestantId: number; // ID of the contestant being picked
  pickNumber: number;   // Position in the draft round (1-based)
}

// Draft round type - represents a complete round of drafting
export interface DraftRound {
  roundNumber: number;  // Which round this is (1-based)
  picks: DraftPick[];   // The picks made in this round
  complete: boolean;    // Whether all picks for this round have been made
}

// Group type
export interface Group {
  name: string;
  slug: string;
  users: User[];
  seasonId?: string;
  createdAt: number;
  draftRounds: DraftRound[]; // List of draft rounds for this group
}
