import {
  Form,
  useParams,
  Link,
  useOutletContext,
  useRouteLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useMemo } from "react";
import { DraftOutletContext, eliminatedStyles } from "./$slug";
import { Button } from "~/components/ui/button";

// Remove loader - use parent route data instead

export default function DraftTab() {
  // Get data from parent route via useRouteLoaderData
  const data = useRouteLoaderData("routes/$slug") as any;
  const { group, contestants } = data;

  // Get outlet context from parent route
  const { currentUser, selectedContestantId, setSelectedContestantId } =
    useOutletContext<DraftOutletContext>();

  const { slug } = useParams();

  // Create contestant map in this component instead of using from context
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

  return (
    <>
      {/* Draft status card */}
      {draftTurn && (
        <div
          className={`mb-6 p-4 rounded-md ${
            draftTurn.isCurrentUser
              ? "bg-blue-50 border border-blue-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div>
            <div className={selectedContestantId ? "text-center" : ""}>
              <p
                className={`font-medium ${
                  selectedContestantId ? "text-xl" : ""
                }`}
              >
                {draftTurn.isCurrentUser
                  ? selectedContestantId
                    ? "Confirm your selection"
                    : "It's your turn to draft"
                  : `${draftTurn.userName} is drafting...`}
              </p>
              {!selectedContestantId && (
                <p className="text-sm text-gray-600">
                  Round {draftTurn.round.roundNumber}, Pick{" "}
                  {draftTurn.round.picks.length + 1}
                </p>
              )}
            </div>

            {draftTurn.isCurrentUser && (
              <div className="mt-3">
                {!selectedContestantId && (
                  <div className="mt-4">
                    <Link to={`/${slug}/undrafted`}>
                      <Button
                        className="bg-black hover:bg-gray-800"
                        type="button"
                      >
                        Draft
                      </Button>
                    </Link>
                  </div>
                )}

                {selectedContestantId &&
                  contestantMap[selectedContestantId] && (
                    <div className="flex flex-col items-center text-center mb-4 mt-2">
                      <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                        <div className="relative overflow-hidden rounded-md aspect-square w-full mb-3">
                          <img
                            src={contestantMap[selectedContestantId].image}
                            alt={contestantMap[selectedContestantId].name}
                            className="object-cover w-full h-full"
                            style={
                              contestantMap[selectedContestantId].eliminated
                                ? eliminatedStyles
                                : {}
                            }
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 mt-1">
                        {contestantMap[selectedContestantId].name}
                      </span>
                    </div>
                  )}

                {draftTurn.isCurrentUser && selectedContestantId && (
                  <Form method="post" className="mt-4">
                    <input type="hidden" name="action" value="makePick" />
                    <input
                      type="hidden"
                      name="userName"
                      value={currentUser?.name || ""}
                    />
                    <input
                      type="hidden"
                      name="contestantId"
                      value={selectedContestantId}
                    />
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
                <th className="py-2 px-4 text-center hidden sm:table-cell">
                  Round
                </th>
                {group.users.map((user: any, index: number) => (
                  <th key={index} className="py-2 px-2 text-center">
                    <div className="font-semibold whitespace-nowrap text-xs sm:text-base">
                      {user.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.draftRounds.map((round: any) => (
                <tr
                  key={round.roundNumber}
                  className={`${round.complete ? "" : "bg-gray-50"} border-b`}
                >
                  <td className="py-4 pr-4 hidden sm:table-cell">
                    <div className="flex flex-col items-center justify-center">
                      <div className="font-medium text-xl">
                        {round.roundNumber}
                      </div>
                      <div className="text-xs text-gray-400">
                        {round.complete ? "complete" : "in progress"}
                      </div>
                    </div>
                  </td>

                  {group.users.map((user: any) => {
                    // Find the pick for this user in this round
                    const pick = round.picks.find(
                      (p: any) => p.userName === user.name
                    );

                    // Determine if this is the cell where the next pick would go
                    const isNextPickCell =
                      !round.complete &&
                      !pick &&
                      draftTurn &&
                      draftTurn.userName === user.name;

                    return (
                      <td
                        key={user.name}
                        className="py-1 px-1 sm:py-2 sm:px-2 align-middle"
                      >
                        {pick && contestantMap[pick.contestantId] ? (
                          <div className="flex flex-col items-center">
                            <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                              <div className="relative overflow-hidden rounded-md aspect-square w-full mb-1">
                                <img
                                  src={contestantMap[pick.contestantId].image}
                                  alt={contestantMap[pick.contestantId].name}
                                  className="object-cover w-full h-full"
                                  style={
                                    contestantMap[pick.contestantId].eliminated
                                      ? eliminatedStyles
                                      : {}
                                  }
                                />
                                {contestantMap[pick.contestantId]
                                  .eliminated && (
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      backgroundColor:
                                        "rgba(239, 68, 68, 0.35)",
                                      mixBlendMode: "multiply",
                                      pointerEvents: "none",
                                    }}
                                  ></div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-xs sm:text-sm font-medium text-center line-clamp-1 mt-1 ${
                                contestantMap[pick.contestantId].eliminated
                                  ? "text-red-800"
                                  : ""
                              }`}
                            >
                              {contestantMap[pick.contestantId].name}
                            </span>
                            <span
                              className={`text-[10px] sm:text-xs ${
                                contestantMap[pick.contestantId].eliminated
                                  ? "text-red-700"
                                  : "text-gray-500"
                              }`}
                            >
                              Pick #{pick.pickNumber}
                            </span>
                          </div>
                        ) : isNextPickCell ? (
                          <div className="h-24 flex items-center justify-center">
                            {draftTurn?.isCurrentUser ? (
                              <div className="text-center">
                                <Link to={`/${slug}/undrafted`}>
                                  <Button
                                    className="text-xs sm:text-sm bg-black hover:bg-gray-800 px-2 py-1 sm:px-3 sm:py-2 h-auto"
                                    disabled={!currentUser}
                                    type="button"
                                  >
                                    Draft
                                  </Button>
                                </Link>
                              </div>
                            ) : (
                              <div className="p-2 sm:p-3 border-2 border-dashed border-gray-300 rounded-md text-center">
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Drafting...
                                </p>
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
                <Button type="submit" variant="outline" className="text-sm">
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
            <Button type="submit">Start First Round</Button>
          </Form>
        </div>
      )}
    </>
  );
}
