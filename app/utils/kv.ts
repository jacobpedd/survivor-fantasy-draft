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