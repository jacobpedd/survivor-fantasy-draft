import {
  useParams,
  Link,
  useOutletContext,
  useRouteLoaderData,
  useFetcher,
} from "@remix-run/react";
import { useMemo } from "react";
import { DraftOutletContext, eliminatedStyles } from "./$slug";
import { Button } from "~/components/ui/button";
import type { AutodraftQueue } from "~/utils/types";

export default function UndraftedTab() {
  // Get data from parent route via useRouteLoaderData
  const data = useRouteLoaderData("routes/$slug") as any;
  const { group, contestants, undraftedContestants, autodraftQueues } = data;

  // Get outlet context from parent route
  const {
    currentUser,
    selectedContestantId,
    setSelectedContestantId,
    submit,
    navigate,
  } = useOutletContext<DraftOutletContext>();

  const { slug } = useParams();

  // Create contestant map in this component
  const contestantMap = useMemo(() => {
    return contestants.reduce((acc: any, contestant: any) => {
      acc[contestant.id] = contestant;
      return acc;
    }, {});
  }, [contestants]);

  // Determine whose turn it is to draft
  const draftTurn = useMemo(() => {
    if (!group.draftRounds || group.draftRounds.length === 0) {
      return null;
    }

    // Find the current round (first incomplete round)
    const currentRound = group.draftRounds.find(
      (round: any) => !round.complete
    );
    if (!currentRound) {
      return null;
    }

    const roundNumber = currentRound.roundNumber;
    const picksCount = currentRound.picks.length;
    const totalUsers = group.users.length;

    // Calculate whose turn it is (rotating draft order)
    const positionInRound = picksCount + 1; // Next pick (1-based)

    // Calculate rotation offset
    const rotationOffset = (roundNumber - 1) % totalUsers;

    // Apply rotation to determine user index
    const userIndex = (rotationOffset + positionInRound - 1) % totalUsers;

    return {
      round: currentRound,
      userIndex,
      userName: group.users[userIndex].name,
      isCurrentUser: currentUser?.name === group.users[userIndex].name,
    };
  }, [group.draftRounds, group.users, currentUser]);

  // Get the current user's autodraft queue
  const getCurrentAutodraftQueue = useMemo(() => {
    if (!currentUser || !autodraftQueues) {
      return {
        contestantIds: [],
        locked: false,
        groupSlug: slug,
        userName: "",
        updatedAt: Date.now(),
      } as AutodraftQueue;
    }
    return (
      autodraftQueues[currentUser.name] || {
        contestantIds: [],
        locked: false,
        groupSlug: slug,
        userName: currentUser.name,
        updatedAt: Date.now(),
      }
    );
  }, [currentUser, autodraftQueues]);

  // Helper functions for autodraft
  const toggleAutodraftSelection = (contestantId: number) => {
    if (!currentUser || getCurrentAutodraftQueue.locked) return;

    // Current selections
    const currentSelections = getCurrentAutodraftQueue.contestantIds || [];

    // Calculate new selections
    let newSelections: number[];

    // If already selected, remove it
    if (currentSelections.includes(contestantId)) {
      newSelections = currentSelections.filter(
        (id: number) => id !== contestantId
      );
    }
    // If we already have 4 selections, replace the last one
    else if (currentSelections.length >= 4) {
      newSelections = [...currentSelections.slice(0, 3), contestantId];
    }
    // Otherwise add it to the list
    else {
      newSelections = [...currentSelections, contestantId];
    }

    // Submit to server
    const formData = new FormData();
    formData.append("action", "saveAutodraftQueue");
    formData.append("userName", currentUser.name);
    formData.append("contestantIds", JSON.stringify(newSelections));
    formData.append("locked", getCurrentAutodraftQueue.locked.toString());
    submit(formData, { method: "post" });
  };

  // Get position in autodraft queue
  const getAutodraftSelectionPosition = useMemo(() => {
    return (contestantId: number): number | null => {
      const selections = getCurrentAutodraftQueue.contestantIds || [];
      const index = selections.indexOf(contestantId);
      return index !== -1 ? index + 1 : null;
    };
  }, [getCurrentAutodraftQueue]);

  // Clear autodraft selections
  const clearAutodraftSelections = () => {
    if (!currentUser || getCurrentAutodraftQueue.locked) return;

    const formData = new FormData();
    formData.append("action", "saveAutodraftQueue");
    formData.append("userName", currentUser.name);
    formData.append("contestantIds", JSON.stringify([]));
    formData.append("locked", getCurrentAutodraftQueue.locked.toString());
    submit(formData, { method: "post" });
  };

  // Toggle lock status
  const toggleAutodraftLock = () => {
    if (!currentUser) return;

    const formData = new FormData();
    formData.append("action", "saveAutodraftQueue");
    formData.append("userName", currentUser.name);
    formData.append(
      "contestantIds",
      JSON.stringify(getCurrentAutodraftQueue.contestantIds || [])
    );
    formData.append("locked", (!getCurrentAutodraftQueue.locked).toString());
    submit(formData, { method: "post" });
  };

  // Use fetcher for navigation without page refresh
  const fetcher = useFetcher();
  
  // Handle selection and navigate to draft tab
  const handleSelectContestant = (contestantId: number) => {
    if (draftTurn?.isCurrentUser) {
      setSelectedContestantId(contestantId);
      // Navigate programmatically using fetcher
      fetcher.load(`/${slug}`);
    } else if (currentUser && !getCurrentAutodraftQueue.locked) {
      toggleAutodraftSelection(contestantId);
    }
  };

  return (
    <>
      {/* Show status cards based on draft state */}
      {draftTurn && (
        <>
          {/* If it's user's turn to draft */}
          {draftTurn.isCurrentUser && (
            <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-200">
              <p className="font-medium mb-1">
                {selectedContestantId
                  ? "Return to Draft tab to confirm your pick"
                  : "Select a contestant below to draft"}
              </p>
              <p className="text-sm text-gray-600">
                Round {draftTurn.round.roundNumber}, Pick{" "}
                {draftTurn.round.picks.length + 1}
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
                    type="button" 
                    onClick={() => fetcher.load(`/${slug}`)}
                  >
                    Return
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* If it's not user's turn - show autodraft UI */}
          {!draftTurn.isCurrentUser && currentUser && (
            <div className="bg-gray-50 p-4 mb-6 rounded-md border border-gray-300">
              <p className="font-medium mb-1">Set up your autodraft queue</p>
              <p className="text-sm text-gray-600 mb-3">
                Select up to 4 contestants in order of preference
              </p>

              {/* Autodraft selections */}
              <div className="mb-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((index) => {
                    const contestantId =
                      getCurrentAutodraftQueue.contestantIds?.[index];
                    const contestant = contestantId
                      ? contestantMap[contestantId]
                      : null;

                    return (
                      <div
                        key={index}
                        className={`border rounded-md p-2 flex flex-col items-center ${
                          getCurrentAutodraftQueue.locked ? "bg-gray-100" : ""
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 text-gray-500">
                          Pick {index + 1}
                        </div>

                        {contestant ? (
                          <div className="w-full">
                            <div className="relative overflow-hidden rounded-md aspect-square w-full mb-1">
                              <img
                                src={contestant.image}
                                alt={contestant.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="text-xs text-center mt-1 line-clamp-1">
                              {contestant.name}
                            </div>

                            {!getCurrentAutodraftQueue.locked && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 py-0 h-6 text-xs"
                                onClick={() =>
                                  toggleAutodraftSelection(contestantId)
                                }
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs h-24 flex items-center justify-center">
                            {getCurrentAutodraftQueue.locked
                              ? "Empty"
                              : "Select below"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAutodraftSelections}
                  disabled={
                    getCurrentAutodraftQueue.locked ||
                    (getCurrentAutodraftQueue.contestantIds?.length || 0) === 0
                  }
                >
                  Clear All
                </Button>

                <Button
                  size="sm"
                  className={
                    getCurrentAutodraftQueue.locked
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }
                  onClick={toggleAutodraftLock}
                  disabled={
                    !getCurrentAutodraftQueue.locked &&
                    (getCurrentAutodraftQueue.contestantIds?.length || 0) === 0
                  }
                >
                  {getCurrentAutodraftQueue.locked
                    ? "Unlock Selections"
                    : "Lock In Selections"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {undraftedContestants.length > 0 ? (
        <>
          {/* Active Contestants */}
          {undraftedContestants.filter((c: any) => !c.eliminated).length >
            0 && (
            <div>
              <h3 className="text-lg font-medium mb-2 sm:mb-4">Active</h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-8">
                {undraftedContestants
                  .filter((contestant: any) => !contestant.eliminated)
                  .map((contestant: any) => (
                    <div
                      key={contestant.id}
                      className={`flex flex-col items-center relative ${
                        // Highlight based on selection state
                        (() => {
                          if (selectedContestantId === contestant.id) {
                            return "ring-2 ring-blue-500 bg-blue-50 rounded-md p-1";
                          }

                          const position = getAutodraftSelectionPosition(
                            contestant.id
                          );
                          if (position !== null) {
                            return "ring-2 ring-green-500 bg-green-50 rounded-md p-1";
                          }

                          return "";
                        })()
                      }`}
                      onClick={() => handleSelectContestant(contestant.id)}
                      style={{
                        cursor:
                          draftTurn?.isCurrentUser ||
                          (!getCurrentAutodraftQueue.locked && currentUser)
                            ? "pointer"
                            : "default",
                      }}
                    >
                      <div className="relative">
                        <div className="relative overflow-hidden rounded-md aspect-square w-full mb-2">
                          <img
                            src={contestant.image}
                            alt={contestant.name}
                            className="object-cover w-full h-full"
                          />

                          {/* Selection overlay */}
                          {selectedContestantId === contestant.id && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}

                          {/* Autodraft selection number */}
                          {(() => {
                            if (!draftTurn?.isCurrentUser) {
                              const position = getAutodraftSelectionPosition(
                                contestant.id
                              );
                              if (position !== null) {
                                return (
                                  <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                    {position}
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
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
          {undraftedContestants.filter((c: any) => c.eliminated).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2 sm:mb-4">Eliminated</h3>

              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                {undraftedContestants
                  .filter((contestant: any) => contestant.eliminated)
                  .map((contestant: any) => (
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
                          handleSelectContestant(contestant.id);
                        }
                      }}
                      style={{
                        cursor: draftTurn?.isCurrentUser
                          ? "pointer"
                          : "default",
                      }}
                    >
                      <div className="relative">
                        <div className="relative overflow-hidden rounded-md aspect-square w-full mb-2">
                          <img
                            src={contestant.image}
                            alt={contestant.name}
                            className="object-cover w-full h-full"
                            style={eliminatedStyles}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: "rgba(239, 68, 68, 0.35)",
                              mixBlendMode: "multiply",
                              pointerEvents: "none",
                            }}
                          ></div>

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
    </>
  );
}
