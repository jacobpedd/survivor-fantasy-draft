import {
  useParams,
  useOutletContext,
  useRouteLoaderData,
  useFetcher,
} from "@remix-run/react";
import { useMemo } from "react";
import { DraftOutletContext, eliminatedStyles } from "./$slug";
import { Button } from "~/components/ui/button";

export default function UndraftedTab() {
  // Get data from parent route via useRouteLoaderData
  const data = useRouteLoaderData("routes/$slug") as any;
  const { group, contestants, undraftedContestants } = data;

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

  // Handle selection and navigate to draft tab
  const handleSelectContestant = (contestantId: number) => {
    if (draftTurn?.isCurrentUser) {
      // If clicking on already selected contestant, clear selection
      if (selectedContestantId === contestantId) {
        setSelectedContestantId(null);
      } else {
        setSelectedContestantId(contestantId);
        // Navigate programmatically 
        navigate(`/${slug}`);
      }
    }
  };

  return (
    <>
      {/* Show status cards based on draft state */}
      {draftTurn && draftTurn.isCurrentUser && (
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
                onClick={() => {
                  navigate(`/${slug}`);
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
          {undraftedContestants.filter((c: any) => !c.eliminated).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2 sm:mb-4">Active</h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-8">
                {undraftedContestants
                  .filter((contestant: any) => !contestant.eliminated)
                  .map((contestant: any) => (
                    <div
                      key={contestant.id}
                      className={`flex flex-col items-center relative ${
                        selectedContestantId === contestant.id
                          ? "ring-2 ring-blue-500 bg-blue-50 rounded-md p-1"
                          : ""
                      }`}
                      onClick={() => handleSelectContestant(contestant.id)}
                      style={{
                        cursor: draftTurn?.isCurrentUser ? "pointer" : "default",
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
                        selectedContestantId === contestant.id
                          ? "ring-2 ring-blue-500 bg-blue-50 rounded-md p-1"
                          : ""
                      }`}
                      onClick={() => {
                        if (draftTurn?.isCurrentUser) {
                          handleSelectContestant(contestant.id);
                        }
                      }}
                      style={{
                        cursor: draftTurn?.isCurrentUser ? "pointer" : "default",
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
