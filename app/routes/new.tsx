import type { MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";
import { createGroup, generateSlug } from "~/utils/kv";
import type { Group, User } from "~/utils/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";

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
  return redirect(`/${slug}?setUser=${encodeURIComponent(yourName.trim())}`);
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Draft Group</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="groupName" className="block text-sm font-medium">
                Group Name
              </label>
              <Input
                id="groupName"
                name="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                placeholder="Enter a name for your draft group"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="yourName" className="block text-sm font-medium">
                Your Name
              </label>
              <Input
                id="yourName"
                name="yourName"
                type="text"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium">
                  Other Members
                </label>
                <Button 
                  type="button" 
                  onClick={addMember} 
                  variant="outline" 
                  size="sm"
                >
                  + Add Another
                </Button>
              </div>
              
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      name={`member-${index}`}
                      type="text"
                      value={member}
                      onChange={(e) => updateMember(index, e.target.value)}
                      placeholder={`Member ${index + 1}`}
                    />
                    {members.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeMember(index)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Add all members who will participate in your draft. You can also add them later.
              </p>
            </div>
            
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full">
              Create Group
            </Button>
          </Form>
        </CardContent>
        
        <CardFooter>
          <CardDescription className="text-center w-full">
            After creating your group, everyone in the group will be able to access it by selecting their name.
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  );
}