import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "Survivor Fantasy Draft" },
    { name: "description", content: "Fantasy draft for Survivor fans" },
  ];
};

export default function Index() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-5xl font-bold text-gray-800 font-survivor">
        Survivor Fantasy Draft
      </h1>
    </div>
  );
}
