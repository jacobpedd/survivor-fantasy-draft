import { useState, useEffect } from "react";
import {
  Outlet,
  useLoaderData,
  useNavigate,
  useLocation,
  Link,
} from "@remix-run/react";
import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { getAllGroups } from "~/utils/kv";
import { Button } from "~/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import ClientOnly from "~/components/ClientOnly";

// Loader function to get all groups
export const loader = async ({ context }: LoaderFunctionArgs) => {
  const groups = await getAllGroups(context.cloudflare.env);

  return json({
    groups: groups.map((g) => ({
      value: g.slug,
      label: g.name,
    })),
  });
};

export default function AdminLayout() {
  const { groups } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  // Get the current slug from the URL
  const pathParts = location.pathname.split("/");
  const currentSlug = pathParts.length > 2 ? pathParts[2] : "";

  // Set the initial value when the component mounts or URL changes
  useEffect(() => {
    if (currentSlug) {
      setValue(currentSlug);
    } else {
      setValue("");
    }
  }, [currentSlug]);

  // Handle selection
  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      // Deselect - go to admin home
      setValue("");
      navigate("/admin");
    } else {
      // Select - navigate to group
      setValue(selectedValue);
      navigate(`/admin/${selectedValue}`);
    }
    setOpen(false);
  };

  return (
    <ClientOnly>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

          <div className="flex items-center w-full gap-2">
            <div className="flex-1">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {value
                      ? groups.find((group) => group.value === value)?.label ||
                        "Select group..."
                      : "Select group..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-full p-0"
                  align="start"
                  sideOffset={4}
                >
                  <Command className="w-full">
                    <CommandInput
                      placeholder="Search groups..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No groups found.</CommandEmpty>
                      <CommandGroup>
                        {groups.map((group) => (
                          <CommandItem
                            key={group.value}
                            value={group.value}
                            onSelect={handleSelect}
                          >
                            {group.label}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                value === group.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {currentSlug && (
              <Link to={`/${currentSlug}`}>
                <Button variant="outline">View Group</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          <Outlet />
        </div>
      </div>
    </ClientOnly>
  );
}
