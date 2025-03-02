import { useParams, useSearchParams } from "@remix-run/react";
import { Link, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useState, useEffect } from "react";
import { getGroup } from "~/utils/kv";
import type { Group, User } from "~/utils/types";
import ClientOnly, { ClientFunction } from "~/components/ClientOnly";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("Group not found", { status: 404 });
  }

  const group = await getGroup(context.cloudflare.env, slug);

  if (!group) {
    throw new Response("Group not found", { status: 404 });
  }

  return json({ group });
};

export default function GroupPage() {
  const { group } = useLoaderData<typeof loader>();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("drafted");
  
  // Mock data for drafted/undrafted contestants
  const draftedContestants = [
    { id: 1, name: "John Smith", tribe: "Green Tribe", status: "Active" },
    { id: 2, name: "Amanda Johnson", tribe: "Blue Tribe", status: "Active" },
    { id: 3, name: "Michael Lee", tribe: "Green Tribe", status: "Eliminated" },
  ];
  
  const undraftedContestants = [
    { id: 4, name: "Sarah Williams", tribe: "Blue Tribe", status: "Active" },
    { id: 5, name: "David Brown", tribe: "Red Tribe", status: "Active" },
    { id: 6, name: "Jessica Miller", tribe: "Red Tribe", status: "Active" },
    { id: 7, name: "Robert Davis", tribe: "Green Tribe", status: "Active" },
  ];
  
  // Check if user exists in localStorage or URL param on client-side
  useEffect(() => {
    // First check if there's a setUser param in the URL (from redirect after creating group)
    const setUserFromParam = searchParams.get('setUser');
    
    if (setUserFromParam) {
      // Find the user in the group by name
      const userIndex = group.users.findIndex(
        user => user.name.toLowerCase() === setUserFromParam.toLowerCase()
      );
      
      if (userIndex >= 0) {
        const user = group.users[userIndex];
        setCurrentUser(user);
        localStorage.setItem(`survivor-user-${slug}`, JSON.stringify(user));
        return;
      }
    }
    
    // Otherwise check localStorage
    const storedUser = localStorage.getItem(`survivor-user-${slug}`);
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (e) {
        // Invalid stored user, show selection
        setShowUserSelection(true);
      }
    } else {
      // No user found, show selection
      setShowUserSelection(true);
    }
  }, [slug, group.users, searchParams]);
  
  // Handle user selection
  const selectExistingUser = (index: number) => {
    const user = group.users[index];
    setCurrentUser(user);
    localStorage.setItem(`survivor-user-${slug}`, JSON.stringify(user));
    setShowUserSelection(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <ClientOnly>
        {showUserSelection ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Welcome to {group.name}</CardTitle>
              </CardHeader>
              
              <CardContent>
                {group.users && group.users.length > 0 ? (
                  <div>
                    <p className="mb-2 font-medium">Select your name:</p>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {group.users.map((user, index) => (
                        <Button
                          key={index}
                          onClick={() => selectExistingUser(index)}
                          variant={selectedExistingUser === index ? "default" : "outline"}
                          className="w-full justify-start h-auto py-2 font-normal"
                        >
                          {user.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">No members found in this group.</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-end">
                <Button variant="link" asChild>
                  <Link to="/groups/new">
                    Create a new group instead
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}
      </ClientOnly>
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <div className="bg-gray-100 rounded-md px-4 py-2 flex items-center space-x-2">
          <span className="text-sm text-gray-500">Share Link:</span>
          <ClientFunction
            fallback={
              <span className="font-mono font-bold text-sm">Loading...</span>
            }
            children={() => (
              <span className="font-mono font-bold text-sm">
                {window.location.origin}/groups/{slug}
              </span>
            )}
          />
        </div>
      </div>
      
      <ClientOnly>
        {currentUser && (
          <Card className="mb-6 bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">Viewing as: </span>
                  <span>{currentUser.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem(`survivor-user-${slug}`);
                    setCurrentUser(null);
                    setShowUserSelection(true);
                  }}
                  className="text-xs text-gray-600 h-7"
                >
                  Switch User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </ClientOnly>
      
      <Tabs 
        defaultValue="drafted" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="drafted">Drafted</TabsTrigger>
          <TabsTrigger value="undrafted">Undrafted</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drafted" className="mt-0">
          <div className="bg-white rounded-md p-4 shadow-sm">
            {draftedContestants.length > 0 ? (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Name</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Tribe</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Status</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Drafter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftedContestants.map((contestant) => (
                      <tr key={contestant.id} className="border-b">
                        <td className="py-2 px-2">{contestant.name}</td>
                        <td className="py-2 px-2">{contestant.tribe}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                            contestant.status === "Eliminated" 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          }`}>
                            {contestant.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {group.users[Math.floor(Math.random() * group.users.length)]?.name || "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-8">
                No contestants have been drafted yet.
              </p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="undrafted" className="mt-0">
          <div className="bg-white rounded-md p-4 shadow-sm">
            {undraftedContestants.length > 0 ? (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Name</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Tribe</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500 text-sm">Status</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {undraftedContestants.map((contestant) => (
                      <tr key={contestant.id} className="border-b">
                        <td className="py-2 px-2">{contestant.name}</td>
                        <td className="py-2 px-2">{contestant.tribe}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                            contestant.status === "Eliminated" 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          }`}>
                            {contestant.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={() => alert(`Draft ${contestant.name}`)}
                          >
                            Draft
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-8">
                All contestants have been drafted.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
