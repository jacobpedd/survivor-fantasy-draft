/**
 * Types for the Survivor Fantasy Draft app
 * These are used for type-safe access to KV storage
 */

// User type
export interface User {
  name: string;
  isAdmin: boolean;
  joinedAt?: number;
}

// Group type
export interface Group {
  name: string;
  slug: string;
  users: User[];
  seasonId?: string;
  createdAt: number;
}
