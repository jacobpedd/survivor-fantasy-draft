import { useParams, useSearchParams } from "@remix-run/react";
import { Link, useLoaderData, useSubmit, Form } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useState, useEffect, useMemo } from "react";
import { getGroup, createDraftRound, makeDraftPick } from "~/utils/kv";
import { getSeasonData } from "~/utils/seasons";
import type { Group, User, DraftRound, DraftPick } from "~/utils/types";
import type { Contestant } from "~/utils/seasons";
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
    
    // Calculate whose turn it is (accounting for snake draft)
    // In odd rounds, go in order; in even rounds, go in reverse
    const positionInRound = picksCount + 1; // Next pick (1-based)
    let userIndex;
    
    if (roundNumber % 2 === 1) {
      // Odd round: forward order
      userIndex = (positionInRound - 1) % totalUsers;
    } else {
      // Even round: reverse order (snake)
      userIndex = totalUsers - 1 - ((positionInRound - 1) % totalUsers);
    }
    
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
    <div className="max-w-4xl mx-auto p-6 mt-8">
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
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            <span>Share</span>
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
                <span className="font-medium">{currentUser.name}</span>
              ) : (
                <span>Select User</span>
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
          <div className="bg-white rounded-md p-6 shadow-sm">
            {/* Draft status card */}
            {draftTurn && (
              <div className={`mb-6 p-4 rounded-md ${draftTurn.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {draftTurn.isCurrentUser ? "It's your turn to draft!" : `Waiting for ${draftTurn.userName} to make a pick...`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Round {draftTurn.round.roundNumber}, Pick {draftTurn.round.picks.length + 1}
                    </p>
                  </div>
                  
                  {draftTurn.isCurrentUser && selectedContestantId && (
                    <Form method="post">
                      <input type="hidden" name="action" value="makePick" />
                      <input type="hidden" name="userName" value={currentUser?.name} />
                      <input type="hidden" name="contestantId" value={selectedContestantId} />
                      <Button 
                        type="submit"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Confirm Pick
                      </Button>
                    </Form>
                  )}
                </div>
                
                {draftTurn.isCurrentUser && (
                  <div className="mt-3">
                    <p className="text-sm mb-2">Select a contestant from the Undrafted tab</p>
                    {selectedContestantId && (
                      <div className="flex items-center bg-white p-2 rounded-md border">
                        <div className="w-12 h-12 mr-3">
                          <img 
                            src={contestantMap[selectedContestantId]?.image} 
                            alt={contestantMap[selectedContestantId]?.name}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Contestant";
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{contestantMap[selectedContestantId]?.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Draft rounds table */}
            {group.draftRounds && group.draftRounds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full mb-4">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="py-2 px-4 text-center w-24">Round</th>
                      {group.users.map((user, index) => (
                        <th key={index} className="py-2 px-2 text-center">
                          <div className="font-semibold whitespace-nowrap">{user.name}</div>
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
                        <td className="py-4 pr-4">
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
                            <td key={user.name} className="py-2 px-2 align-middle">
                              {pick ? (
                                <div className="flex flex-col items-center">
                                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                    <div className="relative overflow-hidden rounded-md aspect-square w-full mb-1">
                                      <img
                                        src={contestantMap[pick.contestantId]?.image}
                                        alt={contestantMap[pick.contestantId]?.name}
                                        className={`object-cover w-full h-full ${
                                          contestantMap[pick.contestantId]?.eliminated ? "opacity-70 grayscale" : ""
                                        }`}
                                        onError={(e) => {
                                          // Fallback image if the contestant image doesn't load
                                          (e.target as HTMLImageElement).src =
                                            "https://via.placeholder.com/150?text=Contestant";
                                        }}
                                      />
                                      {contestantMap[pick.contestantId]?.eliminated && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <X
                                            size={40}
                                            className="text-red-600 stroke-[3] drop-shadow-md"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm font-medium text-center line-clamp-1 mt-1">
                                    {contestantMap[pick.contestantId]?.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Pick #{pick.pickNumber}
                                  </span>
                                </div>
                              ) : isNextPickCell ? (
                                <div className="h-24 flex items-center justify-center">
                                  {draftTurn?.isCurrentUser ? (
                                    <div className="text-center">
                                      <Button 
                                        className="text-sm bg-black hover:bg-gray-800"
                                        onClick={() => setActiveTab("undrafted")}
                                        disabled={!currentUser}
                                      >
                                        Select Contestant
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="p-3 border-2 border-dashed border-gray-300 rounded-md text-center">
                                      <p className="text-sm text-gray-500">Waiting for {user.name}...</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-20 text-sm text-gray-400">
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
                  No draft rounds have started yet.
                </p>
                <Form method="post">
                  <input type="hidden" name="action" value="createRound" />
                  <Button type="submit">
                    Start First Round
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="undrafted" className="mt-0">
          <div className="bg-white rounded-md p-6 shadow-sm">
            {/* Show a draft instruction if it's the user's turn */}
            {draftTurn?.isCurrentUser && (
              <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-200">
                <p className="font-medium mb-1">
                  {selectedContestantId 
                    ? "You've selected a contestant. Confirm your pick in the Draft tab."
                    : "Select a contestant to draft"}
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
                      Clear Selection
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setActiveTab("drafted");
                        // Scroll to top to show the confirm button
                        window.scrollTo(0, 0);
                      }}
                    >
                      Go to Draft to Confirm
                    </Button>
                  </div>
                )}
              </div>
            )}
          
            {undraftedContestants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {undraftedContestants.map((contestant) => (
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
                          className={`object-cover w-full h-full ${
                            contestant.eliminated ? "opacity-70 grayscale" : ""
                          }`}
                          onError={(e) => {
                            // Fallback image if the contestant image doesn't load
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/150?text=Contestant";
                          }}
                        />
                        {contestant.eliminated && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <X
                              size={60}
                              className="text-red-600 stroke-[3] drop-shadow-md"
                            />
                          </div>
                        )}
                        
                        {/* Selection overlay */}
                        {selectedContestantId === contestant.id && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-center">
                      {contestant.name}
                    </span>
                    
                    {/* No bottom button - removed */}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-8">
                All contestants have been drafted.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}