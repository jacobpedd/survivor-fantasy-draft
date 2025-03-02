import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Survivor Fantasy Draft" },
    { name: "description", content: "Fantasy draft for Survivor fans" },
  ];
};

export default function Index() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1 className="text-5xl font-bold text-gray-800 font-survivor mb-8">
        Survivor Fantasy Draft
      </h1>
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold mb-6">
          Join or Create a Draft Group
        </h2>

        <div className="flex flex-col space-y-4 items-center">
          <Link
            to="/groups/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-64 text-center"
          >
            Create New Group
          </Link>

          <Link
            to="/groups/join"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg w-64 text-center"
          >
            Join Existing Group
          </Link>
        </div>
      </div>
    </div>
  );
}
