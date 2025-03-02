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
  // Hard-coded season data for season 48
  if (seasonId === "48") {
    return {
      seasonNumber: 48,
      seasonName: "Survivor Fiji",
      contestants: [
        { id: 1, name: "Charlie Davis", image: "/images/contestants/s48/charlie.jpg" },
        { id: 2, name: "Gabe Killian", image: "/images/contestants/s48/gabe.jpg" },
        { id: 3, name: "Hunter McKnight", image: "/images/contestants/s48/hunter.jpg" },
        { id: 4, name: "Jess Chong", image: "/images/contestants/s48/jess.jpg" },
        { id: 5, name: "Kenney Lu", image: "/images/contestants/s48/kenney.jpg" },
        { id: 6, name: "Liz Wilcox", image: "/images/contestants/s48/liz.jpg" },
        { id: 7, name: "Mars Wright", image: "/images/contestants/s48/mars.jpg" },
        { id: 8, name: "Rachel LaMont", image: "/images/contestants/s48/rachel.jpg" },
        { id: 9, name: "Randen Montalvo", image: "/images/contestants/s48/randen.jpg" },
        { id: 10, name: "Rome Cooney", image: "/images/contestants/s48/rome.jpg" },
        { id: 11, name: "Sam Phalen", image: "/images/contestants/s48/sam.jpg" },
        { id: 12, name: "Sierra Wright", image: "/images/contestants/s48/sierra.jpg" },
        { id: 13, name: "Sol Yi", image: "/images/contestants/s48/sol.jpg" },
        { id: 14, name: "Sue Smey", image: "/images/contestants/s48/sue.jpg" },
        { id: 15, name: "Teeny Chirichillo", image: "/images/contestants/s48/teeny.jpg" },
        { id: 16, name: "Tiyanna Hallums", image: "/images/contestants/s48/tiyanna.jpg" },
        { id: 17, name: "Venus Vafa", image: "/images/contestants/s48/venus.jpg" },
        { id: 18, name: "Yvonne Spicer", image: "/images/contestants/s48/yvonne.jpg" }
      ]
    };
  }
  
  console.error(`Season data not found for ${seasonId}`);
  return null;
}

/**
 * Gets a list of all available seasons
 */
export async function getAllSeasons(): Promise<SeasonInfo[]> {
  // Hard-coded seasons data
  return [
    {
      id: "48",
      name: "Season 48: Survivor Fiji"
    }
  ];
}