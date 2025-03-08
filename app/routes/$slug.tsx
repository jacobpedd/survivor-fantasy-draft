import { useParams, useSearchParams } from "@remix-run/react";
import { Link, useLoaderData, useSubmit, Form } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useState, useEffect, useMemo } from "react";
import { getGroup, createDraftRound, makeDraftPick } from "~/utils/kv";
import { getSeasonData } from "~/utils/seasons";
import type { Group, User, DraftRound, DraftPick } from "~/utils/types";
import type { Contestant } from "~/utils/seasons";
import type { MetaFunction } from "@remix-run/cloudflare";
import { CSSProperties } from "react";
import ClientOnly, { ClientFunction } from "~/components/ClientOnly";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { X, UserRound, Share, Copy, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const group = await getGroup(context.cloudflare.env, slug);

  if (!group) {
    throw new Response("Group not found", { status: 404 });
  }

  // For now, hardcode season 48 as the active season
  const seasonData = await getSeasonData("48");

  if (!seasonData) {
    throw new Response("Season data not found", { status: 404 });
  }

  // Initialize draftRounds if not present
  if (!group.draftRounds) {
    group.draftRounds = [];
  }

  return json({
    group,
    contestants: seasonData.contestants,
  });
};

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  if (!data?.group) {
    return [
      { title: "Group Not Found | Survivor Fantasy Draft" },
      { name: "description", content: "This Survivor Fantasy Draft group could not be found." },
    ];
  }

  const groupName = data.group.name;
  
  return [
    { title: `${groupName} | Survivor Fantasy Draft` },
    { name: "description", content: `Join the ${groupName} group in Survivor Fantasy Draft and compete with friends!` },
    // Open Graph / Facebook meta tags
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://survivor-fantasy-draft.pages.dev/${params.slug}` },
    { property: "og:title", content: `${groupName} | Survivor Fantasy Draft` },
    { property: "og:description", content: `Join the ${groupName} group in Survivor Fantasy Draft and compete with friends!` },
    { property: "og:image", content: "https://survivor-fantasy-draft.pages.dev/logo-dark.png" },
    // Twitter meta tags
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${groupName} | Survivor Fantasy Draft` },
    { name: "twitter:description", content: `Join the ${groupName} group in Survivor Fantasy Draft and compete with friends!` },
    { name: "twitter:image", content: "https://survivor-fantasy-draft.pages.dev/logo-dark.png" },
  ];
};

// Action to handle form submissions for drafting
export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  // Create a new draft round
  if (action === "createRound") {
    await createDraftRound(context.cloudflare.env, slug);
    return json({ success: true, action: "createRound" });
  }

  // Make a draft pick
  if (action === "makePick") {
    const userName = formData.get("userName") as string;
    const contestantId = parseInt(formData.get("contestantId") as string, 10);

    if (!userName || isNaN(contestantId)) {
      return json({ success: false, error: "Invalid draft pick data" }, { status: 400 });
    }

    await makeDraftPick(context.cloudflare.env, slug, userName, contestantId);
    return json({ success: true, action: "makePick" });
  }

  return json({ success: false, error: "Unknown action" }, { status: 400 });
};

// Reusable styles for eliminated contestants
const eliminatedStyles: CSSProperties = {
  filter: "grayscale(90%) brightness(70%)",
  opacity: 0.8
};

// Overlay style for the red tint
const redOverlayStyles: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(220, 38, 38, 0.2)',  // Red with transparency
  mixBlendMode: 'multiply',
  pointerEvents: 'none'
};

export default function GroupPage() {
  const { group, contestants } = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<
    number | null
  >(null);
  const [activeTab, setActiveTab] = useState("drafted");
  const [selectedContestantId, setSelectedContestantId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const submit = useSubmit();

  // Create a lookup for getting a contestant by ID
  const contestantMap = useMemo(() => {
    return contestants.reduce<Record<number, Contestant>>((acc, contestant) => {
      acc[contestant.id] = contestant;
      return acc;
    }, {});
  }, [contestants]);
  
  // Get all drafted contestant IDs
  const draftedContestantIds = useMemo(() => {
    if (!group.draftRounds) return [];
    return group.draftRounds.flatMap(round => 
      round.picks.map(pick => pick.contestantId)
    );
  }, [group.draftRounds]);
  
  // Get undrafted contestants
  const undraftedContestants = useMemo(() => {
    return contestants.filter(c => !draftedContestantIds.includes(c.id));
  }, [contestants, draftedContestantIds]);
  
  // Determine whose turn it is to draft
  const draftTurn = useMemo(() => {
    if (!group.draftRounds || group.draftRounds.length === 0) {
      return null;
    }
    
    // Find the current round (first incomplete round)
    const currentRound = group.draftRounds.find(round => !round.complete);
    if (!currentRound) {
      return null;
    }
    
    const roundNumber = currentRound.roundNumber;
    const picksCount = currentRound.picks.length;
    const totalUsers = group.users.length;
    
    // Calculate whose turn it is (rotating draft order)
    // Each round, the first pick rotates to the last position
    const positionInRound = picksCount + 1; // Next pick (1-based)
    let userIndex;
    
    // Calculate rotation offset: whoever went first in round 1 goes last in round 2, etc.
    // roundNumber - 1 gives us the shift amount (0-indexed round number)
    const rotationOffset = (roundNumber - 1) % totalUsers;
    
    // Apply rotation to determine user index
    userIndex = (rotationOffset + positionInRound - 1) % totalUsers;
    
    return {
      round: currentRound,
      userIndex,
      userName: group.users[userIndex].name,
      isCurrentUser: currentUser?.name === group.users[userIndex].name
    };
  }, [group.draftRounds, group.users, currentUser]);
  
  // Handler for starting a new round
  const handleStartRound = () => {
    submit({ action: "createRound" }, { method: "post" });
  };
  
  // Handler for making a draft pick
  const handleMakePick = (contestantId: number) => {
    if (!currentUser || !draftTurn || !draftTurn.isCurrentUser) return;
    
    submit(
      { 
        action: "makePick", 
        userName: currentUser.name, 
        contestantId: contestantId.toString() 
      }, 
      { method: "post" }
    );
    
    setSelectedContestantId(null);
  };

  // Check if user exists in localStorage or URL param on client-side
  useEffect(() => {
    // First check if there's a setUser param in the URL (from redirect after creating group)
    const setUserFromParam = searchParams.get("setUser");

    if (setUserFromParam) {
      // Find the user in the group by name
      const userIndex = group.users.findIndex(
        (user) => user.name.toLowerCase() === setUserFromParam.toLowerCase()
      );

      if (userIndex >= 0) {
        const user = group.users[userIndex];
        setCurrentUser(user);
        localStorage.setItem(`survivor-user-${slug}`, JSON.stringify(user));
        return;
      }
    }

    // Otherwise check localStorage
    const storedUser = localStorage.getItem(`survivor-user-${slug}`);

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (e) {
        // Invalid stored user, show selection
        setShowUserSelection(true);
      }
    } else {
      // No user found, show selection
      setShowUserSelection(true);
    }
  }, [slug, group.users, searchParams]);

  // Handle user selection
  const selectExistingUser = (index: number) => {
    const user = group.users[index];
    setCurrentUser(user);
    localStorage.setItem(`survivor-user-${slug}`, JSON.stringify(user));
    setShowUserSelection(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-4">
      <h1 className="text-3xl font-bold font-survivor text-center mb-6">
        Survivor Fantasy Draft
      </h1>
      <ClientOnly>
        {showUserSelection ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Select User</CardTitle>
              </CardHeader>

              <CardContent>
                {group.users && group.users.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {group.users.map((user, index) => (
                      <Button
                        key={index}
                        onClick={() => selectExistingUser(index)}
                        variant={
                          selectedExistingUser === index
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-start h-auto py-2 font-normal"
                      >
                        {user.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">
                      No members found in this group.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </ClientOnly>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold">{group.name}</h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            <span className="hidden sm:inline">Share</span>
          </Button>
          
          <ClientOnly>
            {showShareModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="max-w-md w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share size={20} />
                      Share Group
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="mb-2 text-sm text-gray-500">Copy the link below to invite others to join:</p>
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <div className="relative bg-gray-100 rounded-md px-3 py-2 flex-grow">
                        <span className="font-mono text-sm">
                          {window.location.origin}/{slug}
                        </span>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="h-9 w-9"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowShareModal(false)}
                    >
                      Close
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </ClientOnly>
          
          <ClientOnly>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserSelection(true)}
              className="flex items-center gap-2"
            >
              <UserRound size={16} />
              {currentUser ? (
                <span className="font-medium hidden sm:inline">{currentUser.name}</span>
              ) : (
                <span className="hidden sm:inline">Select User</span>
              )}
            </Button>
          </ClientOnly>
        </div>
      </div>

      <Tabs
        defaultValue="drafted"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="drafted">Draft</TabsTrigger>
          <TabsTrigger value="undrafted">Undrafted</TabsTrigger>
        </TabsList>

        <TabsContent value="drafted" className="mt-0">
          {/* Draft status card */}
          {draftTurn && (
            <div className={`mb-6 p-4 rounded-md ${draftTurn.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div>
                <div className={selectedContestantId ? "text-center" : ""}>
                  <p className={`font-medium ${selectedContestantId ? "text-xl" : ""}`}>
                    {draftTurn.isCurrentUser 
                      ? (selectedContestantId ? "Confirm your selection" : "It's your turn to draft") 
                      : `${draftTurn.userName} is drafting...`}
                  </p>
                  {!selectedContestantId && (
                    <p className="text-sm text-gray-600">
                      Round {draftTurn.round.roundNumber}, Pick {draftTurn.round.picks.length + 1}
                    </p>
                  )}
                </div>
                
                {draftTurn.isCurrentUser && (
                  <div className="mt-3">
                    {!selectedContestantId && (
                      <div className="mt-4">
                        <Button
                          onClick={() => setActiveTab("undrafted")}
                          className="bg-black hover:bg-gray-800"
                        >
                          Draft
                        </Button>
                      </div>
                    )}
                    
                    {selectedContestantId && (
                      <div className="flex flex-col items-center text-center mb-4 mt-2">
                        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                          <div className="relative overflow-hidden rounded-md aspect-square w-full mb-3">
                            <img 
                              src={contestantMap[selectedContestantId]?.image} 
                              alt={contestantMap[selectedContestantId]?.name}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Contestant";
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 mt-1">
                          {contestantMap[selectedContestantId]?.name}
                        </span>
                      </div>
                    )}
                    
                    {draftTurn.isCurrentUser && selectedContestantId && (
                      <Form method="post" className="mt-4">
                        <input type="hidden" name="action" value="makePick" />
                        <input type="hidden" name="userName" value={currentUser?.name} />
                        <input type="hidden" name="contestantId" value={selectedContestantId} />
                        <Button 
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          Confirm
                        </Button>
                      </Form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Draft rounds table */}
            {group.draftRounds && group.draftRounds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full mb-4 table-fixed">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="py-2 px-4 text-center hidden sm:table-cell">Round</th>
                      {group.users.map((user, index) => (
                        <th key={index} className="py-2 px-2 text-center">
                          <div className="font-semibold whitespace-nowrap text-xs sm:text-base">{user.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.draftRounds.map((round) => (
                      <tr 
                        key={round.roundNumber} 
                        className={`${round.complete ? "" : "bg-gray-50"} border-b`}
                      >
                        <td className="py-4 pr-4 hidden sm:table-cell">
                          <div className="flex flex-col items-center justify-center">
                            <div className="font-medium text-xl">{round.roundNumber}</div>
                            <div className="text-xs text-gray-400">
                              {round.complete ? "complete" : "in progress"}
                            </div>
                          </div>
                        </td>
                        
                        {group.users.map((user, userIndex) => {
                          // Find the pick for this user in this round
                          const pick = round.picks.find(p => p.userName === user.name);
                          
                          // Determine if this is the cell where the next pick would go
                          const isNextPickCell = !round.complete && 
                            !pick && 
                            draftTurn && 
                            draftTurn.userName === user.name;
                          
                          return (
                            <td key={user.name} className="py-1 px-1 sm:py-2 sm:px-2 align-middle">
                              {pick ? (
                                <div className="flex flex-col items-center">
                                  <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                                    <div className="relative overflow-hidden rounded-md aspect-square w-full mb-1">
                                      <img
                                        src={contestantMap[pick.contestantId]?.image}
                                        alt={contestantMap[pick.contestantId]?.name}
                                        className="object-cover w-full h-full"
                                        style={contestantMap[pick.contestantId]?.eliminated ? eliminatedStyles : {}}
                                        onError={(e) => {
                                          // Fallback image if the contestant image doesn't load
                                          (e.target as HTMLImageElement).src =
                                            "https://via.placeholder.com/150?text=Contestant";
                                        }}
                                      />
                                      {contestantMap[pick.contestantId]?.eliminated && (
                                        <div className="absolute inset-0" style={{
                                          backgroundColor: 'rgba(239, 68, 68, 0.35)',
                                          mixBlendMode: 'multiply',
                                          pointerEvents: 'none'
                                        }}></div>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs sm:text-sm font-medium text-center line-clamp-1 mt-1 ${
                                    contestantMap[pick.contestantId]?.eliminated ? "text-red-800" : ""
                                  }`}>
                                    {contestantMap[pick.contestantId]?.name}
                                  </span>
                                  <span className={`text-[10px] sm:text-xs ${
                                    contestantMap[pick.contestantId]?.eliminated ? "text-red-700" : "text-gray-500"
                                  }`}>
                                    Pick #{pick.pickNumber}
                                  </span>
                                </div>
                              ) : isNextPickCell ? (
                                <div className="h-24 flex items-center justify-center">
                                  {draftTurn?.isCurrentUser ? (
                                    <div className="text-center">
                                      <Button 
                                        className="text-xs sm:text-sm bg-black hover:bg-gray-800 px-2 py-1 sm:px-3 sm:py-2 h-auto"
                                        onClick={() => setActiveTab("undrafted")}
                                        disabled={!currentUser}
                                      >
                                        Draft
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="p-2 sm:p-3 border-2 border-dashed border-gray-300 rounded-md text-center">
                                      <p className="text-xs sm:text-sm text-gray-500">Drafting...</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-16 sm:h-20 text-xs sm:text-sm text-gray-400">
                                  {round.complete ? "Skipped" : "Waiting..."}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!group.draftRounds.length || 
                 (group.draftRounds.length > 0 && 
                  group.draftRounds[group.draftRounds.length - 1].complete)) && (
                  <div className="flex justify-center mt-4">
                    <Form method="post">
                      <input type="hidden" name="action" value="createRound" />
                      <Button 
                        type="submit" 
                        variant="outline" 
                        className="text-sm"
                      >
                        Start Round {(group.draftRounds.length || 0) + 1}
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 italic mb-4">
                  No draft rounds have started yet
                </p>
                <Form method="post">
                  <input type="hidden" name="action" value="createRound" />
                  <Button type="submit">
                    Start First Round
                  </Button>
                </Form>
              </div>
            )}
        </TabsContent>

        <TabsContent value="undrafted" className="mt-0">
          {/* Show a draft instruction if it's the user's turn */}
          {draftTurn?.isCurrentUser && (
            <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-200">
              <p className="font-medium mb-1">
                {selectedContestantId 
                  ? "Return to Draft tab to confirm your pick"
                  : "Select a contestant below to draft"}
              </p>
              <p className="text-sm text-gray-600">
                Round {draftTurn.round.roundNumber}, Pick {draftTurn.round.picks.length + 1}
              </p>
              
              {selectedContestantId && (
                <div className="flex mt-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedContestantId(null)}
                    className="mr-2"
                  >
                    Clear
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setActiveTab("drafted");
                      // Scroll to top to show the confirm button
                      window.scrollTo(0, 0);
                    }}
                  >
                    Return
                  </Button>
                </div>
              )}
            </div>
          )}
        
          {undraftedContestants.length > 0 ? (
            <>
              {/* Active Contestants */}
              {undraftedContestants.filter(c => !c.eliminated).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2 sm:mb-4">Active</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-8">
                    {undraftedContestants
                      .filter(contestant => !contestant.eliminated)
                      .map((contestant) => (
                        <div
                          key={contestant.id}
                          className={`flex flex-col items-center relative ${
                            // Highlight if this contestant is selected
                            selectedContestantId === contestant.id 
                              ? "ring-2 ring-blue-500 bg-blue-50 rounded-md p-1" 
                              : ""
                          }`}
                          onClick={() => {
                            // Only allow selection if it's the user's turn
                            if (draftTurn?.isCurrentUser) {
                              setSelectedContestantId(contestant.id);
                            }
                          }}
                          style={{ cursor: draftTurn?.isCurrentUser ? 'pointer' : 'default' }}
                        >
                          <div className="relative">
                            <div className="relative overflow-hidden rounded-md aspect-square w-full mb-2">
                              <img
                                src={contestant.image}
                                alt={contestant.name}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  // Fallback image if the contestant image doesn't load
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/150?text=Contestant";
                                }}
                              />
                              
                              {/* Selection overlay */}
                              {selectedContestantId === contestant.id && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                  ✓
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="font-medium text-center text-xs sm:text-sm">
                            {contestant.name}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Eliminated Contestants */}
              {undraftedContestants.filter(c => c.eliminated).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2 sm:mb-4">Eliminated</h3>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                    {undraftedContestants
                      .filter(contestant => contestant.eliminated)
                      .map((contestant) => (
                        <div
                          key={contestant.id}
                          className={`flex flex-col items-center relative ${
                            // Highlight if this contestant is selected
                            selectedContestantId === contestant.id 
                              ? "ring-2 ring-blue-500 bg-blue-50 rounded-md p-1" 
                              : ""
                          }`}
                          onClick={() => {
                            // Only allow selection if it's the user's turn
                            if (draftTurn?.isCurrentUser) {
                              setSelectedContestantId(contestant.id);
                            }
                          }}
                          style={{ cursor: draftTurn?.isCurrentUser ? 'pointer' : 'default' }}
                        >
                          <div className="relative">
                            <div className="relative overflow-hidden rounded-md aspect-square w-full mb-2">
                              <img
                                src={contestant.image}
                                alt={contestant.name}
                                className="object-cover w-full h-full"
                                style={eliminatedStyles}
                                onError={(e) => {
                                  // Fallback image if the contestant image doesn't load
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/150?text=Contestant";
                                }}
                              />
                              <div className="absolute inset-0" style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.35)',
                                mixBlendMode: 'multiply',
                                pointerEvents: 'none'
                              }}></div>
                              
                              {/* Selection overlay */}
                              {selectedContestantId === contestant.id && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                  ✓
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="font-medium text-center text-red-800 text-xs sm:text-sm">
                            {contestant.name}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500 italic py-8">
              All contestants have been drafted
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}