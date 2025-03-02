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
  
  // Get all member names
  const memberNames: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-') && typeof value === 'string' && value.trim() !== '') {
      memberNames.push(value.trim());
    }
  }
  
  // Check for duplicate names
  const allNames = [yourName.trim(), ...memberNames];
  const uniqueNames = new Set(allNames.map(name => name.toLowerCase()));
  if (uniqueNames.size !== allNames.length) {
    return json({ error: "Each member must have a unique name" });
  }
  
  const slug = await generateSlug(context.cloudflare.env, groupName);
  
  // Create users array
  const now = Date.now();
  const users: User[] = [
    {
      name: yourName.trim(),
      joinedAt: now
    }
  ];
  
  // Add additional members
  memberNames.forEach(name => {
    users.push({
      name,
      joinedAt: now
    });
  });
  
  // Create the group in KV
  const group: Group = {
    name: groupName.trim(),
    slug,
    users,
    createdAt: now,
  };
  
  await createGroup(context.cloudflare.env, group);
  
  // Set the creator as the current user in localStorage (this will happen client-side after redirect)
  
  // Redirect to the new group page
  return redirect(`/groups/${slug}?setUser=${encodeURIComponent(yourName.trim())}`);
};

export default function NewGroup() {
  const actionData = useActionData<typeof action>();
  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  
  const addMember = () => {
    setMembers([...members, ""]);
  };
  
  const updateMember = (index: number, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = value;
    setMembers(updatedMembers);
  };
  
  const removeMember = (index: number) => {
    if (members.length > 1) {
      const updatedMembers = [...members];
      updatedMembers.splice(index, 1);
      setMembers(updatedMembers);
    }
  };
  
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
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              Other Members
            </label>
            <button
              type="button"
              onClick={addMember}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Another
            </button>
          </div>
          
          <div className="space-y-2">
            {members.map((member, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  name={`member-${index}`}
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(index, e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Member ${index + 1}`}
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Add all members who will participate in your draft. You can also add them later.
          </p>
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
          After creating your group, everyone in the group will be able to access it by selecting their name.
        </p>
      </div>
    </div>
  );
}