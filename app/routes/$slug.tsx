import { useParams, useSearchParams } from "@remix-run/react";
import {
  Link,
  useLoaderData,
  useSubmit,
  Outlet,
  useNavigate,
  useLocation,
} from "@remix-run/react";
import {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  json,
} from "@remix-run/cloudflare";
import { useState, useEffect, useMemo } from "react";
import {
  getGroup,
  createDraftRound,
  makeDraftPick,
} from "~/utils/kv";
import { getSeasonData } from "~/utils/seasons";
import type { User } from "~/utils/types";
import type { Contestant } from "~/utils/seasons";
import type { MetaFunction } from "@remix-run/cloudflare";
import { CSSProperties } from "react";
import { Button } from "~/components/ui/button";
import { UserRound, Share, Copy, Check, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

// This data will be available to all child routes via useRouteLoaderData
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

  // Calculate undrafted contestants for the undrafted tab
  const draftedContestantIds = group.draftRounds
    ? group.draftRounds.flatMap((round) =>
        round.picks.map((pick) => pick.contestantId)
      )
    : [];

  const undraftedContestants = seasonData.contestants.filter(
    (c) => !draftedContestantIds.includes(c.id)
  );

  return json({
    group,
    contestants: seasonData.contestants,
    undraftedContestants,
  });
};

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  if (!data?.group) {
    return [{ title: "Group Not Found | Survivor Fantasy Draft" }];
  }

  const groupName = data.group.name;

  return [{ title: `${groupName} | Survivor Fantasy Draft` }];
};

// Reusable styles for eliminated contestants
export const eliminatedStyles: CSSProperties = {
  filter: "grayscale(90%) brightness(70%)",
  opacity: 0.8,
};

// Type for the outlet context - will be used by child routes
export type DraftOutletContext = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedContestantId: number | null;
  setSelectedContestantId: (id: number | null) => void;
  submit: ReturnType<typeof useSubmit>;
  navigate: ReturnType<typeof useNavigate>;
};

export default function GroupLayout() {
  const { group, contestants } = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<
    number | null
  >(null);
  const [selectedContestantId, setSelectedContestantId] = useState<
    number | null
  >(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();

  // Create a contestant map for quick lookups - moved from context to a memoized value
  const contestantMap = useMemo(() => {
    return contestants.reduce<Record<number, Contestant>>((acc, contestant) => {
      acc[contestant.id] = contestant;
      return acc;
    }, {});
  }, [contestants]);

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
    <div className="max-w-4xl mx-auto px-6 pt-6">
      {/* User selection modal */}
      {showUserSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
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
                        selectedExistingUser === index ? "default" : "outline"
                      }
                      className="w-full justify-between h-auto py-2 font-normal"
                    >
                      <span>{user.name}</span>
                      {currentUser && user.name === currentUser.name && (
                        <CheckCircle size={16} className="text-green-600" />
                      )}
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
      )}

      <div className="my-6">
        {/* Centered title */}
        <h1 className="text-4xl font-bold font-survivor text-center mb-3">{group.name}</h1>
        
        {/* Controls row */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            <span className="inline">Share</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserSelection(true)}
            className="flex items-center gap-2"
          >
            <UserRound size={16} />
            {currentUser ? (
              <span className="font-medium inline">
                {currentUser.name}
              </span>
            ) : (
              <span className="inline">Select User</span>
            )}
          </Button>
        </div>

        {/* Share modal with ClientOnly wrapper removed - handle conditionally */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share size={20} />
                  Share Group
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="mb-2 text-sm text-gray-500">
                  Copy the link below to invite others to join:
                </p>

                <div className="flex items-center space-x-2 mt-3">
                  <div className="relative bg-gray-100 rounded-md px-3 py-2 flex-grow">
                    <span className="font-mono text-sm">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/${slug}`
                        : ""}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (typeof navigator !== "undefined") {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/${slug}`
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="h-9 w-9"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
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
      </div>

      <div className="w-full">
        {/* Tab navigation - simplified */}
        <div className="grid w-full grid-cols-2 mb-6 border rounded-md overflow-hidden">
          <Link
            to={`/${slug}`}
            className={`py-2 text-center font-medium cursor-pointer ${
              !location.pathname.endsWith("/undrafted")
                ? "bg-black text-white"
                : "bg-gray-100"
            }`}
            prefetch="intent"
          >
            Draft
          </Link>
          <Link
            to={`/${slug}/undrafted`}
            className={`py-2 text-center font-medium cursor-pointer ${
              location.pathname.endsWith("/undrafted")
                ? "bg-black text-white"
                : "bg-gray-100"
            }`}
            prefetch="intent"
          >
            Undrafted
          </Link>
        </div>

        {/* Pass required data using outlet context instead of custom context */}
        <Outlet
          context={{
            currentUser,
            setCurrentUser,
            selectedContestantId,
            setSelectedContestantId,
            submit,
            navigate,
          }}
        />
      </div>
    </div>
  );
}
