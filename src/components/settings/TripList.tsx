import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {Calendar as CalendarIcon, Pencil, Check, X, Trash2, Globe2Icon} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trip } from "@/types/trip";
import currencies from "@/data/currencies";

export function TripList() {
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editedTrip, setEditedTrip] = useState<Partial<Trip>>({});
  const [editDate, setEditDate] = useState<DateRange | undefined>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const handleStartEditing = (trip: Trip) => {
    setEditingTripId(trip.id);
    setEditedTrip({
      ...trip,
      dailyBudget: trip.dailyBudget,
      totalBudget: trip.totalBudget,
    });
    setEditDate({
      from: trip.dateRange.from ? new Date(trip.dateRange.from) : undefined,
      to: trip.dateRange.to ? new Date(trip.dateRange.to) : undefined
    });
  };

  const handleBudgetChange = (value: string, type: "daily" | "total") => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (editDate?.from && editDate?.to) {
      const days = Math.ceil(
          (editDate.to.getTime() - editDate.from.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (type === "daily") {
        setEditedTrip({
          ...editedTrip,
          dailyBudget: numValue,
          totalBudget: numValue * days,
        });
      } else {
        setEditedTrip({
          ...editedTrip,
          totalBudget: numValue,
          dailyBudget: numValue / days,
        });
      }
    } else {
      if (type === "daily") {
        setEditedTrip({ ...editedTrip, dailyBudget: numValue });
      } else {
        setEditedTrip({ ...editedTrip, totalBudget: numValue });
      }
    }
  };

  const handleSaveEdit = () => {
    if (!editedTrip.name || !editDate?.from) {
      toast.error("Please fill in all required fields");
      return;
    }

    const updatedTrips = trips.map((trip) => {
      if (trip.id === editingTripId) {
        return {
          ...trip,
          ...editedTrip,
          dateRange: {
            from: editDate.from,
            to: editDate.to,
          },
        };
      }
      return trip;
    });

    setTrips(updatedTrips);
    
    // Save to localStorage
    localStorage.setItem("trips", JSON.stringify(updatedTrips));
    window.dispatchEvent(new Event('storageChange'));

    setEditingTripId(null);
    setEditedTrip({});
    setEditDate(undefined);
    toast.success("Trip updated successfully!");
  };

  const handleDeleteTrip = (tripId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this trip?");
    if (!confirmed) return;

    setTrips(trips.filter((trip) => trip.id !== tripId));
    localStorage.setItem("trips", JSON.stringify(trips.filter((trip) => trip.id !== tripId)));
    if (selectedTripId === tripId) {
      localStorage.removeItem("selectedTripId");
      setSelectedTripId(null);
    }
    toast.success("Trip deleted successfully!");
  };

  const handleStorageChange = () => {
    const savedTrips = localStorage.getItem("trips");
    const savedSelectedTripId = localStorage.getItem("selectedTripId");

    if (savedTrips) {
      setTrips(JSON.parse(savedTrips));
    }

    if (savedSelectedTripId) {
      setSelectedTripId(savedSelectedTripId);
    }
  }

  useEffect(() => {
    window.addEventListener('storageChange', handleStorageChange);
    handleStorageChange();

    return () => {
      window.removeEventListener('storageChange', handleStorageChange);
    }
  }, []);

  return (
      <div className="space-y-4">
        {trips.map((trip) => (
            <div
                key={trip.id}
                className={cn(
                    "flex items-center gap-1 border-b pb-3 rounded-lg transition-colors p-2",
                    selectedTripId === trip.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
            >
              {editingTripId === trip.id ? (
                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-4">
                      {trip.photo && (
                          <img
                              src={editedTrip.photo || trip.photo}
                              alt={editedTrip.name || trip.name}
                              className="w-16 h-16 object-cover rounded"
                          />
                      )}
                      <div className="flex-1">
                        <Input
                            value={editedTrip.name || ""}
                            onChange={(e) => setEditedTrip({ ...editedTrip, name: e.target.value })}
                            placeholder="Trip name"
                        />
                        <div className="mt-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditedTrip({ ...editedTrip, photo: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editDate?.from ? (
                                editDate.to ? (
                                    <>
                                      {format(editDate.from, "LLL dd, y")} - {format(editDate.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(editDate.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={editDate?.from}
                              selected={editDate}
                              onSelect={setEditDate}
                              numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Daily Budget</Label>
                        <Input
                            type="number"
                            value={editedTrip.dailyBudget || ""}
                            onChange={(e) => handleBudgetChange(e.target.value, "daily")}
                            placeholder="Daily budget"
                        />
                      </div>
                      <div>
                        <Label>Total Budget</Label>
                        <Input
                            type="number"
                            value={editedTrip.totalBudget || ""}
                            onChange={(e) => handleBudgetChange(e.target.value, "total")}
                            placeholder="Total budget"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Currency</Label>
                      <Select
                          value={editedTrip.currency || trip.currency}
                          onValueChange={(value) => setEditedTrip({ ...editedTrip, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((curr) => (
                              <SelectItem key={curr} value={curr}>
                                {curr}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTripId(null);
                            setEditedTrip({});
                            setEditDate(undefined);
                          }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
              ) : (
                  <>
                    <div
                        className="flex-1 items-center gap-4 cursor-pointer"
                        onClick={() => {
                          setSelectedTripId(trip.id);
                          localStorage.setItem("selectedTripId", trip.id);
                          window.dispatchEvent(new Event('storageChange'));
                        }}
                    >
                      <div className="flex gap-2 justify-between pb-2">
                        {trip.photo && (
                            <img
                                src={trip.photo}
                                alt={trip.name}
                                className="w-16 h-16 object-cover rounded"
                            />
                        )}
                        {!trip.photo && <Globe2Icon className="w-16 h-16"/>}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleStartEditing(trip)}>
                            <Pencil className="h-4 w-4"/>
                          </Button>
                          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTrip(trip.id)}
                          >
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">{trip.name} <span className="text-gray-400">{selectedTripId === trip.id ? "[Current Trip]" : ""}</span></h4>
                        <p className="text-sm text-muted-foreground">
                          {trip.dateRange?.from && format(new Date(trip.dateRange?.from), "LLL dd, y")} -{" "}
                          {trip.dateRange?.to && format(new Date(trip.dateRange?.to), "LLL dd, y")}
                        </p>
                        <p className="text-sm">
                          Daily: {trip.dailyBudget?.toFixed(2)} {trip.currency} |
                          Total: {trip.totalBudget?.toFixed(2)} {trip.currency}
                        </p>
                      </div>
                    </div>
                  </>
              )}
            </div>
        ))}
      </div>
  );
}
