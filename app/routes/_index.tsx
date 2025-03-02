import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const meta: MetaFunction = () => {
  return [
    { title: "Survivor Fantasy Draft" },
    { name: "description", content: "Fantasy draft for Survivor fans" },
  ];
};

export default function Index() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1 className="text-5xl font-bold font-survivor mb-8">
        Survivor Fantasy Draft
      </h1>

      <Button asChild className="w-64">
        <Link to="/new">Create New Group</Link>
      </Button>
    </div>
  );
}
