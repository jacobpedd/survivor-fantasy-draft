import { Group } from "./types";

/**
 * KV utility functions for working with Cloudflare KV
 */

// Prefix keys for different data types
const KV_PREFIX = {
  GROUP: "group:",
};

/**
 * Get a group by its slug
 */
export async function getGroup(env: Env, slug: string): Promise<Group | null> {
  const key = `${KV_PREFIX.GROUP}${slug}`;
  const data = await env.SURVIVOR_KV.get(key);
  
  if (!data) {
    return null;
  }
  
  try {
    return JSON.parse(data) as Group;
  } catch (e) {
    console.error("Error parsing group data:", e);
    return null;
  }
}

/**
 * Create a new group
 */
export async function createGroup(env: Env, group: Group): Promise<Group> {
  const key = `${KV_PREFIX.GROUP}${group.slug}`;
  await env.SURVIVOR_KV.put(key, JSON.stringify(group));
  return group;
}

/**
 * Update an existing group
 */
export async function updateGroup(env: Env, group: Group): Promise<Group> {
  const key = `${KV_PREFIX.GROUP}${group.slug}`;
  await env.SURVIVOR_KV.put(key, JSON.stringify(group));
  return group;
}

/**
 * Create a new draft round for a group
 */
export async function createDraftRound(env: Env, groupSlug: string): Promise<Group | null> {
  // Get the current group
  const group = await getGroup(env, groupSlug);
  
  if (!group) {
    return null;
  }
  
  // Initialize draftRounds array if it doesn't exist
  if (!group.draftRounds) {
    group.draftRounds = [];
  }
  
  // Calculate the next round number
  const nextRoundNumber = group.draftRounds.length + 1;
  
  // Create a new empty round
  group.draftRounds.push({
    roundNumber: nextRoundNumber,
    picks: [],
    complete: false
  });
  
  // Save the updated group
  await updateGroup(env, group);
  
  return group;
}

/**
 * Make a draft pick
 */
export async function makeDraftPick(
  env: Env, 
  groupSlug: string, 
  userName: string, 
  contestantId: number
): Promise<Group | null> {
  // Get the current group
  const group = await getGroup(env, groupSlug);
  
  if (!group) {
    return null;
  }
  
  // Ensure draftRounds exists
  if (!group.draftRounds || group.draftRounds.length === 0) {
    return null; // No active rounds
  }
  
  // Get the current round (last round that's not complete)
  const currentRoundIndex = group.draftRounds.findIndex(round => !round.complete);
  
  if (currentRoundIndex === -1) {
    return null; // No active rounds
  }
  
  const currentRound = group.draftRounds[currentRoundIndex];
  
  // Calculate the next pick number
  const nextPickNumber = currentRound.picks.length + 1;
  
  // Add the pick to the current round
  currentRound.picks.push({
    userName,
    contestantId,
    pickNumber: nextPickNumber
  });
  
  // Check if the round is complete (all users have picked)
  if (currentRound.picks.length === group.users.length) {
    currentRound.complete = true;
  }
  
  // Save the updated group
  await updateGroup(env, group);
  
  return group;
}

/**
 * Checks if a group with the given slug exists
 */
export async function slugExists(env: Env, slug: string): Promise<boolean> {
  const key = `${KV_PREFIX.GROUP}${slug}`;
  const data = await env.SURVIVOR_KV.get(key);
  return data !== null;
}

/**
 * Generate a base slug from a string (without random suffix)
 */
export function generateBaseSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * Generate a URL-friendly slug from a string
 * Only adds a random suffix if the slug is already taken
 */
export async function generateSlug(env: Env, str: string): Promise<string> {
  const baseSlug = generateBaseSlug(str);
  
  // Check if the base slug is already taken
  const exists = await slugExists(env, baseSlug);
  
  if (!exists) {
    return baseSlug;
  }
  
  // If the slug is taken, add a random suffix
  return baseSlug.concat('-', Math.random().toString(36).substring(2, 6));
}