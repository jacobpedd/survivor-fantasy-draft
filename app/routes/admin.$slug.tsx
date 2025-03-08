import { useState, useEffect } from "react";
import {
  Link,
  useParams,
  useLoaderData,
  useSubmit,
  Form,
} from "@remix-run/react";
import {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  json,
  redirect
} from "@remix-run/cloudflare";
import { getGroup, updateGroup, deleteGroup } from "~/utils/kv";
import { Button } from "~/components/ui/button";
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
    groupJson: JSON.stringify(group, null, 2),
  });
};

// Action function to handle form submissions
export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
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
        return json(
          { success: false, error: "Cannot change the group slug" },
          { status: 400 }
        );
      }

      // Update the group
      await updateGroup(context.cloudflare.env, updatedGroup);

      return json({ success: true, message: "Group updated successfully" });
    } catch (error) {
      console.error("Error updating group:", error);
      return json(
        { success: false, error: "Invalid JSON: " + (error as Error).message },
        { status: 400 }
      );
    }
  }
  
  if (action === "deleteGroup") {
    try {
      // Delete the group
      const success = await deleteGroup(context.cloudflare.env, slug);
      
      if (success) {
        // Redirect to admin home if successful
        return redirect("/admin");
      } else {
        return json(
          { success: false, error: "Failed to delete group" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      return json(
        { success: false, error: "Error deleting group: " + (error as Error).message },
        { status: 500 }
      );
    }
  }

  return json({ success: false, error: "Unknown action" }, { status: 400 });
};

export default function GroupAdminPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const submit = useSubmit();
  const [jsonValue, setJsonValue] = useState(loaderData.groupJson);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when loader data changes (when URL/slug changes)
  useEffect(() => {
    setJsonValue(loaderData.groupJson);
    setError(null);
    setSuccess(null);
    setShowDeleteConfirm(false);
  }, [loaderData]);

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
          groupJson: jsonValue,
        },
        { method: "post" }
      );

      setSuccess("Group updated successfully");
    } catch (error) {
      setError("Invalid JSON: " + (error as Error).message);
    }
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      submit(
        { action: "deleteGroup" },
        { method: "post" }
      );
    } else {
      setShowDeleteConfirm(true);
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

          <div className="mb-4">
            <textarea
              name="groupJson"
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              className="w-full h-96 font-mono text-sm p-4 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex justify-between">
            <div>
              <Button
                type="button"
                variant="destructive"
                className={`${showDeleteConfirm ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"}`}
                onClick={handleDelete}
              >
                {showDeleteConfirm ? "Confirm Delete" : "Delete Group"}
              </Button>
            </div>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={formatJson}
              >
                Format JSON
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </ClientOnly>
  );
}
