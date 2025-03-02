import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { getAllSeasons } from "~/utils/seasons";

export const meta: MetaFunction = () => {
  return [
    { title: "Survivor Fantasy Draft" },
    { name: "description", content: "Fantasy draft for Survivor fans" },
  ];
};

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  // Get all the seasons from our utility function
  const seasons = await getAllSeasons();
  return json({ seasons });
};

export default function Index() {
  const { seasons } = useLoaderData<typeof loader>();
  
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1 className="text-5xl font-bold text-gray-800 font-survivor mb-8">
        Survivor Fantasy Draft
      </h1>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Available Seasons</h2>
        <ul className="space-y-2">
          {seasons.map((season) => (
            <li key={season.id} className="p-2 border rounded hover:bg-gray-100">
              <Link to={`/seasons/${season.id}`} className="block">
                {season.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-gray-500 text-sm">
          Select a season to view contestants
        </p>
      </div>
    </div>
  );
}
