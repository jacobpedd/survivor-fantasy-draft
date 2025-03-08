/**
 * Utility functions for working with season data
 */

export type Contestant = {
  id: number;
  eliminated: boolean;
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
      seasonName: "Survivor 48",
      contestants: [
        {
          id: 1,
          eliminated: false,
          name: "Bianca Roses",
          image: "/images/contestants/s48/bianca-roses.jpg",
        },
        {
          id: 2,
          eliminated: false,
          name: "Cedrek McFadden",
          image: "/images/contestants/s48/cedrek-mcfadden.jpg",
        },
        {
          id: 3,
          eliminated: false,
          name: "Charity Nelms",
          image: "/images/contestants/s48/charity-nelms.jpg",
        },
        {
          id: 4,
          eliminated: false,
          name: "Chrissy Sarnowsky",
          image: "/images/contestants/s48/chrissy-sarnowsky.jpg",
        },
        {
          id: 5,
          eliminated: false,
          name: "David Kinne",
          image: "/images/contestants/s48/david-kinne.jpg",
        },
        {
          id: 6,
          eliminated: false,
          name: "Eva Erickson",
          image: "/images/contestants/s48/eva-erickson.jpg",
        },
        {
          id: 7,
          eliminated: false,
          name: "Joe Hunter",
          image: "/images/contestants/s48/joe-hunter.jpg",
        },
        {
          id: 8,
          eliminated: false,
          name: "Justin Pioppi",
          image: "/images/contestants/s48/justin-pioppi.jpg",
        },
        {
          id: 9,
          eliminated: false,
          name: "Kamilla Karthigesu",
          image: "/images/contestants/s48/kamilla-karthigesu.jpg",
        },
        {
          id: 10,
          eliminated: true,
          name: "Kevin Leung",
          image: "/images/contestants/s48/kevin-leung.jpg",
        },
        {
          id: 11,
          eliminated: false,
          name: "Kyle Fraser",
          image: "/images/contestants/s48/kyle-fraser.jpg",
        },
        {
          id: 12,
          eliminated: false,
          name: "Mary Zheng",
          image: "/images/contestants/s48/mary-zheng.jpg",
        },
        {
          id: 13,
          eliminated: false,
          name: "Mitch Guerra",
          image: "/images/contestants/s48/mitch-guerra.jpg",
        },
        {
          id: 14,
          eliminated: false,
          name: "Sai Hughley",
          image: "/images/contestants/s48/sai-hughley.jpg",
        },
        {
          id: 15,
          eliminated: false,
          name: "Shauhin Davari",
          image: "/images/contestants/s48/shauhin-davari.jpg",
        },
        {
          id: 16,
          eliminated: false,
          name: "Star Toomey",
          image: "/images/contestants/s48/star-toomey.jpg",
        },
        {
          id: 17,
          eliminated: true,
          name: "Stephanie Berger",
          image: "/images/contestants/s48/stephanie-berger.jpg",
        },
        {
          id: 18,
          eliminated: false,
          name: "Thomas Krottinger",
          image: "/images/contestants/s48/thomas-krottinger.jpg",
        },
      ],
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
      name: "Season 48: Survivor",
    },
  ];
}
