import type { MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Create Draft Group | Survivor Fantasy Draft" },
    { name: "description", content: "Create a new draft group" },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const groupName = formData.get("groupName")?.toString();
  
  if (!groupName || groupName.trim() === "") {
    return json({ error: "Group name is required" });
  }
  
  // TODO: Create group in database
  
  // Generate a random 6-character code for the group
  const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // For now, just redirect to a mock group page
  return redirect(`/groups/${groupCode}`);
};

export default function NewGroup() {
  const actionData = useActionData<typeof action>();
  const [groupName, setGroupName] = useState("");
  
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
          {actionData?.error && (
            <p className="mt-1 text-red-600 text-sm">{actionData.error}</p>
          )}
        </div>
        
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
          After creating your group, you'll get a group code to share with friends.
        </p>
      </div>
    </div>
  );
}