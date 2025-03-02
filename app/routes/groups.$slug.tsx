import { useParams } from "@remix-run/react";
import { Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { getAllSeasons } from "~/utils/seasons";
import { getGroup } from "~/utils/kv";
import type { Group } from "~/utils/types";
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

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
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

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Members</h2>
          <Link
            to={`/groups/${slug}`}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded-md"
          >
            + Join Group
          </Link>
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
                  {user.isAdmin && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
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
