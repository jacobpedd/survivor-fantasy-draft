/**
 * Utility functions for working with season data
 */

export type Contestant = {
  id: number;
  name: string;
  image: string;
};

export type Season = {
  seasonNumber: number;
  seasonName: string;
  contestants: Contestant[];
};

export type SeasonInfo = {
  id: string;
  name: string;
};

/**
 * Loads season data from a JSON file
 * 
 * @param seasonId - The ID of the season to load
 * @returns The season data or null if not found
 */
export async function getSeasonData(seasonId: string): Promise<Season | null> {
  try {
    // In a browser context, we use fetch
    const response = await fetch(`/data/seasons/${seasonId}.json`);
    
    if (!response.ok) {
      console.error(`Failed to load season data for ${seasonId}`);
      return null;
    }
    
    return await response.json() as Season;
  } catch (error) {
    console.error(`Error loading season data for ${seasonId}:`, error);
    return null;
  }
}

/**
 * Gets a list of all available seasons
 */
export async function getAllSeasons(): Promise<SeasonInfo[]> {
  try {
    const response = await fetch('/data/seasons/index.json');
    
    if (!response.ok) {
      console.error('Failed to load seasons index');
      return [];
    }
    
    const data = await response.json();
    return data.seasons as SeasonInfo[];
  } catch (error) {
    console.error('Error loading seasons index:', error);
    return [];
  }
}