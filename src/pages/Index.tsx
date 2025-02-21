import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import {ListChecks, PieChart, Settings as SettingsIcon, Plus, Search, X} from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { Dashboard} from "@/components/Dashboard.tsx";

const Index = () => {
  const [activeTab, setActiveTab] = useState("entries");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Load trips and set the latest trip as selected if none is selected
    const tripsData = JSON.parse(localStorage.getItem("trips") || "[]");
    setTrips(tripsData);

    const storedSelectedTrip = localStorage.getItem("selectedTripId");
    if (!storedSelectedTrip && tripsData.length > 0) {
      const latestTrip = tripsData[tripsData.length - 1];
      localStorage.setItem("selectedTripId", latestTrip.id);
      setSelectedTripId(latestTrip.id);
    } else {
      setSelectedTripId(storedSelectedTrip);
    }

    // Listen for external storage changes
    const handleStorageChange = () => {
      const updatedTrips = JSON.parse(localStorage.getItem("trips") || "[]");
      setTrips(updatedTrips);
      setSelectedTripId(localStorage.getItem("selectedTripId"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSetSelectedTrip = (tripId: string) => {
    localStorage.setItem("selectedTripId", tripId);
    setSelectedTripId(tripId);
    toast.success("Current trip updated");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    if (query && query.length > 2) {
      setSearchQuery(query);
    } else {
      setSearchQuery("");
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      const date = parseISO(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "";
    }
  };

  if (!selectedTripId) {
    return (
        <div className="container py-8">
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">Select a Trip</h1>
                <p className="text-muted-foreground">Choose a trip to start tracking expenses</p>
              </div>
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <SettingsIcon className="h-5 w-5"/>
                </Button>
              </Link>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
                <Card key={trip.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{trip.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(trip.date_from)} - {formatDate(trip.date_to)}
                        </p>
                        {trip.id === selectedTripId && (
                            <p className="text-sm font-medium text-primary mt-1">Current Trip</p>
                        )}
                      </div>
                      {trip.id !== selectedTripId && (
                          <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => handleSetSelectedTrip(trip.id)}>
                              Set as Current Trip
                            </Button>
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          {trips.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No trips found</p>
                <Link to="/settings">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Trip
                  </Button>
                </Link>
              </div>
          )}
        </div>
    );
  }

  return (
      <div className="container py-5 relative min-h-screen">
        <Tabs defaultValue="entries" onValueChange={handleTabChange} className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <TabsList className="flex items-center space-x-2 h-10 bg-white">
              <TabsTrigger value="entries" className="flex gap-2 bg-white">
                <ListChecks className="h-4 w-4"/>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex gap-2">
                <PieChart className="h-4 w-4"/>
              </TabsTrigger>
            </TabsList>
            {activeTab === "entries" && (
                <div className="mx-2 relative w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                      type="text"
                      placeholder="Search expenses"
                      onChange={handleSearchChange}
                      className="pl-10 h-10 text-sm rounded-xl"
                  />
                  {searchQuery && (
                      <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4"/>
                      </button>
                  )}
                </div>
            )}
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <SettingsIcon className="h-5 w-5"/>
              </Button>
            </Link>
          </div>
          <TabsContent value="entries">
            <ExpenseList query={searchQuery}/>
          </TabsContent>
          <TabsContent value="stats">
            <Dashboard/>
          </TabsContent>
        </Tabs>

        {activeTab === "entries" && (
          <Button
              className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 z-10"
              onClick={() => setShowAddExpense(true)}
          >
            <Plus className="h-6 w-6"/>
          </Button>
        )}

        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogContent className="max-w-md" aria-describedby="">
            <ExpenseForm onSuccess={() => setShowAddExpense(false)}/>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default Index;
