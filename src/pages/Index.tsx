import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { ListChecks, PieChart, Settings as SettingsIcon, Plus, Search, X } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { Dashboard } from "@/components/Dashboard.tsx";

const MemoizedExpenseList = memo(ExpenseList);
const MemoizedDashboard = memo(Dashboard);

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

const TripCard = memo(({
                         trip,
                         selectedTripId,
                         onSelectTrip
                       }: {
  trip: any,
  selectedTripId: string | null,
  onSelectTrip: (id: string) => void
}) => (
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
                <Button className="flex-1" onClick={() => onSelectTrip(trip.id)}>
                  Set as Current Trip
                </Button>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
));

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState("entries");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTripData = useCallback(() => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Error loading trip data:", error);
      toast.error("Failed to load trip data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTripData();

    const handleStorageChange = () => {
      loadTripData();
    };

    window.addEventListener("storageChange", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storageChange", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadTripData]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleSetSelectedTrip = useCallback((tripId: string) => {
    localStorage.setItem("selectedTripId", tripId);
    setSelectedTripId(tripId);
    toast.success("Current trip updated");
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query.length > 2 ? query : "");
  }, []);

  const handleToggleAddExpense = useCallback((isOpen: boolean) => {
    setShowAddExpense(isOpen);
  }, []);

  const handleExpenseSuccess = useCallback(() => {
    setShowAddExpense(false);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const tripList = useMemo(() => {
    return trips.map(trip => (
        <TripCard
            key={trip.id}
            trip={trip}
            selectedTripId={selectedTripId}
            onSelectTrip={handleSetSelectedTrip}
        />
    ));
  }, [trips, selectedTripId, handleSetSelectedTrip]);

  if (loading) {
    return <LoadingSpinner />
  }

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
            {tripList}
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
                          onClick={clearSearch}
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
            <MemoizedExpenseList query={searchQuery}/>
          </TabsContent>
          <TabsContent value="stats">
            <MemoizedDashboard />
          </TabsContent>
        </Tabs>

        {activeTab === "entries" && (
            <Button
                className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 z-10"
                onClick={() => handleToggleAddExpense(true)}
            >
              <Plus className="h-6 w-6"/>
            </Button>
        )}

        <Dialog open={showAddExpense} onOpenChange={handleToggleAddExpense}>
          <DialogContent className="max-w-md max-h-screen h-full sm:h-auto overflow-y-auto" aria-describedby="">
            <ExpenseForm onSuccess={handleExpenseSuccess}/>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default Index;
