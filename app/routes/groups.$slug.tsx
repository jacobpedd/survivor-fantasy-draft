import { useParams, useSearchParams } from "@remix-run/react";
import { Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useState, useEffect } from "react";
import { getGroup } from "~/utils/kv";
import { getSeasonData } from "~/utils/seasons";
import type { Group, User } from "~/utils/types";
import ClientOnly, { ClientFunction } from "~/components/ClientOnly";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
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

  return json({
    group,
    contestants: seasonData.contestants,
  });
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
  const [activeTab, setActiveTab] = useState("undrafted");

  // In a real app, this would come from the database
  // For now, let's randomly assign a few contestants as drafted
  const [draftedContestantIds] = useState<number[]>(() => {
    // Randomly select 5 contestants as drafted
    const drafted = new Set<number>();
    while (drafted.size < 5) {
      const randomId = Math.floor(Math.random() * contestants.length) + 1;
      drafted.add(randomId);
    }
    return Array.from(drafted);
  });

  // Filter contestants into drafted and undrafted
  const draftedContestants = contestants.filter((c) =>
    draftedContestantIds.includes(c.id)
  );
  const undraftedContestants = contestants.filter(
    (c) => !draftedContestantIds.includes(c.id)
  );

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
                <CardTitle>Welcome to {group.name}</CardTitle>
              </CardHeader>

              <CardContent>
                {group.users && group.users.length > 0 ? (
                  <div>
                    <p className="mb-2 font-medium">Select your name:</p>
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
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">
                      No members found in this group.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button variant="link" asChild>
                  <Link to="/groups/new">Create a new group instead</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}
      </ClientOnly>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <div className="bg-gray-100 rounded-md px-4 py-2 flex items-center space-x-2">
          <span className="text-sm text-gray-500">Share Link:</span>
          <ClientFunction
            fallback={
              <span className="font-mono font-bold text-sm">Loading...</span>
            }
            children={() => (
              <span className="font-mono font-bold text-sm">
                {window.location.origin}/groups/{slug}
              </span>
            )}
          />
        </div>
      </div>

      <ClientOnly>
        {currentUser && (
          <Card className="mb-6 bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">Viewing as: </span>
                  <span>{currentUser.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem(`survivor-user-${slug}`);
                    setCurrentUser(null);
                    setShowUserSelection(true);
                  }}
                  className="text-xs text-gray-600 h-7"
                >
                  Switch User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </ClientOnly>

      <Tabs
        defaultValue="drafted"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="drafted">Drafted</TabsTrigger>
          <TabsTrigger value="undrafted">Undrafted</TabsTrigger>
        </TabsList>

        <TabsContent value="drafted" className="mt-0">
          <div className="bg-white rounded-md p-6 shadow-sm">
            {draftedContestants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {draftedContestants.map((contestant) => {
                  // Randomly assign a drafter from the group
                  const drafter =
                    group.users[Math.floor(Math.random() * group.users.length)]
                      ?.name || "Unknown";

                  return (
                    <div
                      key={contestant.id}
                      className="flex flex-col items-center"
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
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                            Drafted by: {drafter}
                          </div>
                        </div>
                      </div>
                      <span className="font-medium text-center">
                        {contestant.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-8">
                No contestants have been drafted yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="undrafted" className="mt-0">
          <div className="bg-white rounded-md p-6 shadow-sm">
            {undraftedContestants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {undraftedContestants.map((contestant) => (
                  <div
                    key={contestant.id}
                    className="flex flex-col items-center"
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
                      </div>
                    </div>
                    <span className="font-medium text-center">
                      {contestant.name}
                    </span>
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
