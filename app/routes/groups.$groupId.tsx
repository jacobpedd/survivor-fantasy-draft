import { Link, useParams } from "@remix-run/react";
import { getAllSeasons } from "~/utils/seasons";
import { useEffect, useState } from "react";

export default function GroupPage() {
  const { groupId } = useParams();
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);
  
  useEffect(() => {
    const loadSeasons = async () => {
      const seasons = await getAllSeasons();
      setSeasons(seasons);
    };
    
    loadSeasons();
  }, []);
  
  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Draft Group</h1>
        <div className="bg-gray-100 rounded-md px-4 py-2 flex items-center space-x-2">
          <span className="text-sm text-gray-500">Group Code:</span>
          <span className="font-mono font-bold">{groupId}</span>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Members</h2>
        <div className="bg-white rounded-md p-4 shadow-sm">
          <p className="text-center text-gray-500 italic">Waiting for members to join...</p>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Share the group code with friends to let them join your draft group.</p>
        </div>
      </div>
      
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Select Season</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seasons.map((season) => (
            <Link 
              key={season.id}
              to={`/groups/${groupId}/seasons/${season.id}`}
              className="bg-white rounded-md p-4 border hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="font-bold">{season.name}</div>
              <div className="text-sm text-gray-600 mt-1">Start new draft</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}