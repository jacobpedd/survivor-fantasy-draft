import { Outlet } from "@remix-run/react";

// This is a parent layout route for all group-related routes
export default function GroupsLayout() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Outlet />
    </div>
  );
}