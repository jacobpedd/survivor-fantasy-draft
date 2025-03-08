import { useState } from "react";
import { Link, useParams, useLoaderData, useSubmit, Form } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { getGroup, updateGroup } from "~/utils/kv";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert } from "~/components/ui/alert";
import ClientOnly from "~/components/ClientOnly";

// Loader function to get group data
export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const group = await getGroup(context.cloudflare.env, slug);

  if (!group) {
    throw new Response("Group not found", { status: 404 });
  }

  return json({ 
    group,
    groupJson: JSON.stringify(group, null, 2)
  });
};

// Action function to handle form submissions
export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "updateGroup") {
    const groupJson = formData.get("groupJson") as string;
    
    try {
      // Parse the JSON to validate it
      const updatedGroup = JSON.parse(groupJson);
      
      // Ensure the slug hasn't been changed
      if (updatedGroup.slug !== slug) {
        return json({ success: false, error: "Cannot change the group slug" }, { status: 400 });
      }
      
      // Update the group
      await updateGroup(context.cloudflare.env, updatedGroup);
      
      return json({ success: true, message: "Group updated successfully" });
    } catch (error) {
      console.error("Error updating group:", error);
      return json({ success: false, error: "Invalid JSON: " + (error as Error).message }, { status: 400 });
    }
  }

  return json({ success: false, error: "Unknown action" }, { status: 400 });
};

export default function GroupAdminPage() {
  const { group, groupJson } = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const submit = useSubmit();
  const [jsonValue, setJsonValue] = useState(groupJson);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      // Validate JSON
      JSON.parse(jsonValue);
      
      submit(
        { 
          action: "updateGroup", 
          groupJson: jsonValue
        }, 
        { method: "post" }
      );
      
      setSuccess("Group updated successfully");
    } catch (error) {
      setError("Invalid JSON: " + (error as Error).message);
    }
  };

  const formatJson = () => {
    try {
      const parsedJson = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsedJson, null, 2));
      setError(null);
    } catch (error) {
      setError("Invalid JSON: " + (error as Error).message);
    }
  };

  return (
    <ClientOnly>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin: {group.name}</h1>
          <Link to={`/${slug}`}>
            <Button variant="outline">Back to Group</Button>
          </Link>
        </div>

        {error && (
          <Alert className="mb-4 bg-red-50 text-red-800 border border-red-200 p-4 rounded-md">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200 p-4 rounded-md">
            {success}
          </Alert>
        )}

        <div className="bg-white rounded-md shadow-sm p-6">
          <Form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold mb-4">Edit Group JSON</h2>
            <p className="text-sm text-gray-500 mb-4">
              Warning: Editing this JSON directly can break your group if not done carefully.
              The changes will take effect immediately.
            </p>
            
            <div className="flex justify-end mb-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={formatJson}
                className="text-sm"
              >
                Format JSON
              </Button>
            </div>
            
            <div className="mb-4">
              <textarea
                name="groupJson"
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                className="w-full h-96 font-mono text-sm p-4 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </ClientOnly>
  );
}