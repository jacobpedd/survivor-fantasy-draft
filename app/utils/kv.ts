import { Group, AutodraftQueue } from "./types";

/**
 * KV utility functions for working with Cloudflare KV
 */

// Prefix keys for different data types
const KV_PREFIX = {
  GROUP: "group:",
  AUTODRAFT: "autodraft:", // New prefix for autodraft queues
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
 * Get all groups from KV
 * Note: This is potentially inefficient for a large number of groups
 * and should be replaced with pagination for production use
 */
export async function getAllGroups(env: Env): Promise<Group[]> {
  // List all keys with the group prefix
  const { keys } = await env.SURVIVOR_KV.list({ prefix: KV_PREFIX.GROUP });
  
  if (!keys || keys.length === 0) {
    return [];
  }
  
  // Fetch all groups in parallel
  const groupPromises = keys.map(async (key) => {
    const data = await env.SURVIVOR_KV.get(key.name);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as Group;
    } catch (e) {
      console.error(`Error parsing group data for key ${key.name}:`, e);
      return null;
    }
  });
  
  const groups = await Promise.all(groupPromises);
  
  // Filter out any null values (failed to fetch or parse)
  return groups.filter((group): group is Group => group !== null);
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

/**
 * Delete a group by its slug
 */
export async function deleteGroup(env: Env, slug: string): Promise<boolean> {
  const key = `${KV_PREFIX.GROUP}${slug}`;
  
  try {
    await env.SURVIVOR_KV.delete(key);
    return true;
  } catch (error) {
    console.error("Error deleting group:", error);
    return false;
  }
}

/**
 * Save a user's autodraft queue
 */
export async function saveAutodraftQueue(
  env: Env, 
  groupSlug: string, 
  userName: string, 
  contestantIds: number[], 
  locked: boolean
): Promise<boolean> {
  // Create a unique key for this user's queue in this group
  const key = `${KV_PREFIX.AUTODRAFT}${groupSlug}:${userName}`;
  
  const queue = {
    groupSlug,
    userName,
    contestantIds,
    locked,
    updatedAt: Date.now()
  };
  
  try {
    await env.SURVIVOR_KV.put(key, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.error("Error saving autodraft queue:", error);
    return false;
  }
}

/**
 * Get a user's autodraft queue
 */
export async function getAutodraftQueue(
  env: Env, 
  groupSlug: string, 
  userName: string
): Promise<AutodraftQueue | null> {
  const key = `${KV_PREFIX.AUTODRAFT}${groupSlug}:${userName}`;
  
  try {
    const data = await env.SURVIVOR_KV.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data) as AutodraftQueue;
  } catch (error) {
    console.error("Error getting autodraft queue:", error);
    return null;
  }
}

/**
 * Delete a user's autodraft queue
 */
export async function deleteAutodraftQueue(
  env: Env, 
  groupSlug: string, 
  userName: string
): Promise<boolean> {
  const key = `${KV_PREFIX.AUTODRAFT}${groupSlug}:${userName}`;
  
  try {
    await env.SURVIVOR_KV.delete(key);
    return true;
  } catch (error) {
    console.error("Error deleting autodraft queue:", error);
    return false;
  }
}

/**
 * Get all autodraft queues for a group
 * Useful for processing autodrafts
 */
export async function getGroupAutodraftQueues(
  env: Env,
  groupSlug: string
): Promise<AutodraftQueue[]> {
  const prefix = `${KV_PREFIX.AUTODRAFT}${groupSlug}:`;
  
  try {
    // List all keys with the appropriate prefix
    const { keys } = await env.SURVIVOR_KV.list({ prefix });
    
    if (!keys || keys.length === 0) {
      return [];
    }
    
    // Fetch all queues in parallel
    const queuePromises = keys.map(async (key) => {
      const data = await env.SURVIVOR_KV.get(key.name);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as AutodraftQueue;
      } catch (e) {
        console.error(`Error parsing autodraft queue for key ${key.name}:`, e);
        return null;
      }
    });
    
    const queues = await Promise.all(queuePromises);
    
    // Filter out any null values (failed to fetch or parse)
    return queues.filter((queue): queue is AutodraftQueue => queue !== null);
  } catch (error) {
    console.error("Error getting group autodraft queues:", error);
    return [];
  }
}