import type { MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Join Draft Group | Survivor Fantasy Draft" },
    { name: "description", content: "Join an existing draft group" },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const groupCode = formData.get("groupCode")?.toString();
  
  if (!groupCode || groupCode.trim() === "") {
    return json({ error: "Group code is required" });
  }
  
  // TODO: Validate group code exists in database
  
  // For now, just redirect to the group page
  return redirect(`/groups/${groupCode}`);
};

export default function JoinGroup() {
  const actionData = useActionData<typeof action>();
  const [groupCode, setGroupCode] = useState("");
  
  return (
    <div className="max-w-md mx-auto p-6 mt-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Join Draft Group</h1>
      
      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="groupCode" className="block text-sm font-medium mb-1">
            Group Code
          </label>
          <input
            id="groupCode"
            name="groupCode"
            type="text"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the 6-character group code"
            maxLength={6}
            autoCapitalize="characters"
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
            Join Group
          </button>
        </div>
      </Form>
      
      <div className="mt-8">
        <p className="text-sm text-gray-600">
          Ask the group creator for the 6-character code.
        </p>
      </div>
    </div>
  );
}