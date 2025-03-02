import { useParams, useSearchParams } from "@remix-run/react";
import { Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useState, useEffect } from "react";
import { getAllSeasons } from "~/utils/seasons";
import { getGroup } from "~/utils/kv";
import type { Group, User } from "~/utils/types";
import ClientOnly, { ClientFunction } from "~/components/ClientOnly";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const group = await getGroup(context.cloudflare.env, slug);

  if (!group) {
    throw new Response("Group not found", { status: 404 });
  }

  const seasons = await getAllSeasons();

  return json({ group, seasons });
};

export default function GroupPage() {
  const { group, seasons } = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<number | null>(null);
  
  // Check if user exists in localStorage or URL param on client-side
  useEffect(() => {
    // First check if there's a setUser param in the URL (from redirect after creating group)
    const setUserFromParam = searchParams.get('setUser');
    
    if (setUserFromParam) {
      // Find the user in the group by name
      const userIndex = group.users.findIndex(
        user => user.name.toLowerCase() === setUserFromParam.toLowerCase()
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
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Welcome to {group.name}</h2>
              
              {group.users && group.users.length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Select your name:</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {group.users.map((user, index) => (
                      <button
                        key={index}
                        onClick={() => selectExistingUser(index)}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 ${
                          selectedExistingUser === index ? 'bg-blue-100 border border-blue-300' : 'border'
                        }`}
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">No members found in this group.</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Link
                  to="/groups/new"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Create a new group instead
                </Link>
              </div>
            </div>
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
          <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">Viewing as: </span>
                <span>{currentUser.name}</span>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem(`survivor-user-${slug}`);
                  setCurrentUser(null);
                  setShowUserSelection(true);
                }}
                className="text-xs text-gray-600 hover:underline"
              >
                Switch User
              </button>
            </div>
          </div>
        )}
      </ClientOnly>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Members</h2>
          <ClientOnly>
            {!currentUser ? (
              <button
                onClick={() => setShowUserSelection(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded-md"
              >
                + Join Group
              </button>
            ) : null}
          </ClientOnly>
        </div>

        {group.users && group.users.length > 0 ? (
          <div className="bg-white rounded-md p-4 shadow-sm">
            <ul className="divide-y">
              {group.users.map((user, index) => (
                <li
                  key={index}
                  className="py-2 flex justify-between items-center"
                >
                  <div>
                    <span>{user.name}</span>
                    {user.joinedAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        Joined {new Date(user.joinedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-md p-4 shadow-sm">
            <p className="text-center text-gray-500 italic">
              Waiting for members to join...
            </p>
          </div>
        )}

        <div className="mt-4 bg-blue-50 rounded-md p-3 text-sm border border-blue-100">
          <div className="font-medium text-blue-800 mb-1">
            Share with friends:
          </div>
          <ClientFunction
            fallback={
              <div className="text-gray-500">Loading share link...</div>
            }
            children={() => (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono bg-white px-2 py-1 text-xs border rounded truncate">
                  {window.location.origin}/groups/{slug}
                </span>
                <button
                  className="text-blue-700 hover:text-blue-900 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/groups/${slug}`
                    );
                  }}
                >
                  Copy
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Select Season</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seasons.map((season) => (
            <Link
              key={season.id}
              to={`/groups/${slug}/seasons/${season.id}`}
              className="bg-white rounded-md p-4 border hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="font-bold">{season.name}</div>
              <div className="text-sm text-gray-600 mt-1">Start new draft</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
