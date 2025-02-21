import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, Globe2 as Globe2Icon, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Trip } from "@/types/trip";
import { NewTripForm } from "@/components/settings/NewTripForm";
import { TripList } from "@/components/settings/TripList";
import { DataManagement } from "@/components/settings/DataManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input"; // for searchable input
import { toast } from "sonner";
import currencies from "@/data/currencies";
import { getUserLocation } from "@/utils/helpers";
import { LocationData } from "@/types/location.ts";

function Settings() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [currentTrip, setCurrentTrip] = useState<Trip>(null);

  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [saveSelectedLocation, setSaveSelectedLocation] = useState<boolean>(false);
  const [currencyConversion, setCurrencyConversion] = useState<boolean>(false);

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [fromCurrency, setFromCurrency] = useState<string>("USD");

  // For filtering the currency list as user types
  const [searchFrom, setSearchFrom] = useState<string>("");
  const [searchTo, setSearchTo] = useState<string>("");

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    country: "",
    city: "",
    updated_at: new Date(),
  });

  useEffect(() => {
    const savedTrips = localStorage.getItem("trips");
    const savedSelectedTripId = localStorage.getItem("selectedTripId");
    const savedGpsSetting = localStorage.getItem("gpsEnabled");
    const saveSaveSelectedLocation = localStorage.getItem("saveSelectedLocation");
    const savedCurrencyConversion = localStorage.getItem("currencyConversion");
    const savedLocation = localStorage.getItem("userLocation");
    const savedFromCurrency = localStorage.getItem("fromCurrency");

    if (savedSelectedTripId) {
      setSelectedTripId(savedSelectedTripId);
    }
    if (savedTrips) {
      setTrips(JSON.parse(savedTrips));
    }
    if (savedTrips && savedSelectedTripId) {
      setCurrentTrip(JSON.parse(savedTrips).find((t: any) => t.id === savedSelectedTripId));
    }
    if (savedGpsSetting) {
      setGpsEnabled(JSON.parse(savedGpsSetting));
    }
    if (saveSaveSelectedLocation) {
      setSaveSelectedLocation(JSON.parse(saveSaveSelectedLocation));
    }
    if (savedCurrencyConversion) {
      setCurrencyConversion(JSON.parse(savedCurrencyConversion));
    }
    if (savedLocation) {
      setLocation(JSON.parse(savedLocation));
    }

    if (savedFromCurrency) {
      setFromCurrency(savedFromCurrency);
    }

  }, []);

  useEffect(() => {
    localStorage.setItem("trips", JSON.stringify(trips));
    window.dispatchEvent(new Event('storageChange'));
    const savedTrips = localStorage.getItem("trips");
    const savedSelectedTripId = localStorage.getItem("selectedTripId");
    if (savedTrips && savedSelectedTripId) {
      setCurrentTrip(JSON.parse(savedTrips).find((t: any) => t.id === savedSelectedTripId));
    }
  }, [trips]);

  useEffect(() => {
    localStorage.setItem("gpsEnabled", JSON.stringify(gpsEnabled));
    if (gpsEnabled) {
      getUserLocation()
          .then((locationData: LocationData) => {
            setLocation(locationData);
            localStorage.setItem("userLocation", JSON.stringify(locationData));
            toast.success("Location updated!");
          })
          .catch((error) => {
            toast.error("Location access denied");
          });
    }
  }, [gpsEnabled]);

  useEffect(() => {
    localStorage.setItem("saveSelectedLocation", JSON.stringify(saveSelectedLocation));
  }, [saveSelectedLocation]);

  useEffect(() => {
    localStorage.setItem("currencyConversion", JSON.stringify(currencyConversion));
  }, [currencyConversion]);

  // If we want to also persist fromCurrency/toCurrency
  // whenever user changes them, update localStorage:
  useEffect(() => {
    localStorage.setItem("fromCurrency", fromCurrency);
  }, [fromCurrency]);

  // Filter function for the currency arrays
  const filteredFromCurrencies = currencies.filter((c) =>
      c.toLowerCase().includes(searchFrom.toLowerCase())
  );
  const filteredToCurrencies = currencies.filter((c) =>
      c.toLowerCase().includes(searchTo.toLowerCase())
  );

  return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <DataManagement trips={trips} />
        </div>

        <Tabs defaultValue="trips" className="space-y-1">
          <TabsList className="flex items-center space-x-2 h-10 bg-white">
            <TabsTrigger value="trips" className="flex gap-2 bg-white">
              <Globe2Icon className="h-4 w-4" /> Trips
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex gap-2">
              <SettingsIcon className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            <div className="space-y-6">
              <NewTripForm setTrips={setTrips} />

              <Card>
                <h3 className="text-lg font-semibold mb-4 p-2">Your Trips</h3>
                <TripList
                    trips={trips}
                    setTrips={setTrips}
                    selectedTripId={selectedTripId}
                    setSelectedTripId={setSelectedTripId}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-4">
              {/* GPS Switch */}
              <div className="flex items-center justify-between mb-4 font-bold">
                <span>Enable GPS tracking</span>
                <Switch checked={gpsEnabled} onCheckedChange={setGpsEnabled}/>
              </div>
              {gpsEnabled && location.city && (
                  <p className="mt-2 text-sm text-gray-600">
                    Current location: {location.city}, {location.country.toUpperCase()}
                  </p>
              )}

              {/* GPS Switch */}
              <div className="flex items-center justify-between mt-4 mb-4 font-bold">
                <span>Save last selected location</span>
                <Switch checked={saveSelectedLocation} onCheckedChange={setSaveSelectedLocation}/>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                If the PIN button next to Location is pressed and this option is selected, it will try to find the
                coordinates of Location and Country and save it
              </p>

              {/* Currency Conversion Switch */}
              <div className="mt-6 flex items-center justify-between font-bold">
                <span>Allow price conversions</span>
                <Switch
                    checked={currencyConversion}
                    onCheckedChange={setCurrencyConversion}
                />
              </div>

              {/* If currencyConversion is ON, show 2 Popovers in a row */}
              {currencyConversion && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    {/* FROM CURRENCY Popover */}
                    <div className="w-full sm:w-1/2">
                      <label className="block text-sm font-medium mb-1">From Currency</label>
                      <Popover open={openFrom} onOpenChange={setOpenFrom}>
                        <PopoverTrigger asChild>
                          <Button variant="outline"
                                  className="w-full justify-between"
                                  onClick={() => setOpenFrom((prev) => !prev)}
                          >
                            {fromCurrency} <ChevronDown className="ml-2 h-4 w-4"/>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2">
                          <Input
                              placeholder="Search currency..."
                              value={searchFrom}
                              onChange={(e) => setSearchFrom(e.target.value)}
                              className="mb-2"
                          />
                          <div className="max-h-48 overflow-auto">
                            {filteredFromCurrencies.map((c) => (
                                <div
                                    key={c}
                                    onClick={() => {
                                      setFromCurrency(c);
                                      setOpenFrom(false);
                                    }}
                                    className="cursor-pointer p-2 hover:bg-gray-100 rounded"
                                >
                                  {c}
                                </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* TO CURRENCY Popover */}
                    <div className="w-full sm:w-1/2">
                      <label className="block text-sm font-medium mb-1">To
                        Currency: {currentTrip?.currency || "EUR"}</label>
                    </div>
                  </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

export default Settings;
