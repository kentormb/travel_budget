
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { defaultCategories } from "@/config/defaultCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trip } from "@/types/trip";
import currencies from "@/data/currencies"

interface NewTripFormProps {
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
}

export function NewTripForm({ setTrips }: NewTripFormProps) {
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({});
  const [date, setDate] = useState<DateRange | undefined>();

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTrip({ ...newTrip, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBudgetChange = (value: string, type: 'daily' | 'total') => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (date?.from && date?.to) {
      const days = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24));

      if (type === 'daily') {
        setNewTrip({
          ...newTrip,
          dailyBudget: numValue,
          totalBudget: numValue * days
        });
      } else {
        setNewTrip({
          ...newTrip,
          totalBudget: numValue,
          dailyBudget: numValue / days
        });
      }
    } else {
      if (type === 'daily') {
        setNewTrip({ ...newTrip, dailyBudget: numValue });
      } else {
        setNewTrip({ ...newTrip, totalBudget: numValue });
      }
    }
  };

  const handleSave = () => {
    if (!newTrip.name || !date?.from) {
      toast.error("Please fill in all required fields");
      return;
    }

    const tripId = Date.now().toString();

    const trip: Trip = {
      id: tripId,
      name: newTrip.name,
      photo: newTrip.photo || '',
      dateRange: {
        from: date.from,
        to: date.to
      },
      expenses: [],
      categories: { ...defaultCategories },
      currency: newTrip.currency || 'EUR',
      dailyBudget: newTrip.dailyBudget,
      totalBudget: newTrip.totalBudget,
    };

    console.log(trip)

    setTrips(prevTrips => [...prevTrips, trip]);
    setNewTrip({});
    setDate(undefined);
    localStorage.setItem('selectedTripId', tripId);
    toast.success("Trip added successfully!");
  };

  return (
    <Card className="p-3">
      <h3 className="text-lg font-semibold mb-4">Add New Trip</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="tripName">Trip Name</Label>
          <Input
            id="tripName"
            value={newTrip.name || ''}
            onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
            placeholder="Enter trip name"
          />
        </div>

        <div>
          <Label htmlFor="tripPhoto">Trip Photo</Label>
          <div className="flex gap-2">
            <Input
              id="tripPhoto"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <Button size="icon">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
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
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dailyBudget">Daily Budget</Label>
            <Input
              id="dailyBudget"
              type="number"
              value={newTrip.dailyBudget || ''}
              onChange={(e) => handleBudgetChange(e.target.value, 'daily')}
              placeholder="Enter daily budget"
            />
          </div>
          <div>
            <Label htmlFor="totalBudget">Total Budget</Label>
            <Input
              id="totalBudget"
              type="number"
              value={newTrip.totalBudget || ''}
              onChange={(e) => handleBudgetChange(e.target.value, 'total')}
              placeholder="Enter total budget"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={newTrip.currency || 'EUR'}
            onValueChange={(value) => setNewTrip({ ...newTrip, currency: value })}
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

        <Button onClick={handleSave} className="w-full">
          Save Trip
        </Button>
      </div>
    </Card>
  );
}
