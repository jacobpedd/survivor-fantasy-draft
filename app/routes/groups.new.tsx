import type { MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";
import { createGroup, generateSlug } from "~/utils/kv";
import type { Group, User } from "~/utils/types";

export const meta: MetaFunction = () => {
  return [
    { title: "Create Draft Group | Survivor Fantasy Draft" },
    { name: "description", content: "Create a new draft group" },
  ];
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const groupName = formData.get("groupName")?.toString();
  const yourName = formData.get("yourName")?.toString();
  
  if (!groupName || groupName.trim() === "") {
    return json({ error: "Group name is required" });
  }

  if (!yourName || yourName.trim() === "") {
    return json({ error: "Your name is required" });
  }
  
  const slug = await generateSlug(context.cloudflare.env, groupName);
  
  // Create initial user
  const admin: User = {
    name: yourName.trim(),
    isAdmin: true,
    joinedAt: Date.now()
  };
  
  // Create the group in KV
  const group: Group = {
    name: groupName.trim(),
    slug,
    users: [admin],
    createdAt: Date.now(),
  };
  
  await createGroup(context.cloudflare.env, group);
  
  // Redirect to the new group page
  return redirect(`/groups/${slug}`);
};

export default function NewGroup() {
  const actionData = useActionData<typeof action>();
  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  
  return (
    <div className="max-w-md mx-auto p-6 mt-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Draft Group</h1>
      
      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium mb-1">
            Group Name
          </label>
          <input
            id="groupName"
            name="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a name for your draft group"
          />
        </div>
        
        <div>
          <label htmlFor="yourName" className="block text-sm font-medium mb-1">
            Your Name
          </label>
          <input
            id="yourName"
            name="yourName"
            type="text"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
          />
        </div>
        
        {actionData?.error && (
          <p className="mt-1 text-red-600 text-sm">{actionData.error}</p>
        )}
        
        <div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
          >
            Create Group
          </button>
        </div>
      </Form>
      
      <div className="mt-8">
        <p className="text-sm text-gray-600">
          After creating your group, you'll get a shareable link for friends to join.
        </p>
      </div>
    </div>
  );
}