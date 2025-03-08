import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { getAllGroups } from "~/utils/kv";

export const loader = async ({ context }: LoaderFunctionArgs) => {
  // Get all groups
  const groups = await getAllGroups(context.cloudflare.env);
  
  // If there are groups, redirect to the first one
  if (groups.length > 0) {
    return redirect(`/admin/${groups[0].slug}`);
  }
  
  // Otherwise, continue to render the index page
  return null;
};

export default function AdminIndex() {
  return (
    <div className="bg-white rounded-md shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
      <p className="text-gray-600 mb-4">
        Select a group from the dropdown above to edit its data.
      </p>
      <p className="text-gray-500 text-sm">
        You can modify draft rounds, picks, and other group properties directly in JSON format.
      </p>
    </div>
  );
}