import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {ArrowLeft, Settings as SettingsIcon, Globe2 as Globe2Icon, ChevronDown, Search} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewTripForm } from "@/components/settings/NewTripForm";
import { TripList } from "@/components/settings/TripList";
import { DataManagement } from "@/components/settings/DataManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import currencies from "@/data/currencies";
import { currentCurrencySymbol } from "@/utils/helpers";

function Settings() {
  const navigate = useNavigate();
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [saveSelectedLocation, setSaveSelectedLocation] = useState<boolean>(false);
  const [updateLocationInNewExpenses, setUpdateLocationInNewExpenses] = useState<boolean>(false);
  const [currencyConversion, setCurrencyConversion] = useState<boolean>(false);
  const [openFrom, setOpenFrom] = useState(false);
  const [fromCurrency, setFromCurrency] = useState<string>("EUR");
  const [searchFrom, setSearchFrom] = useState<string>("");

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    country: "",
    city: "",
    updated_at: new Date(),
  });

  useEffect(() => {
    const savedGpsSetting = localStorage.getItem("gpsEnabled");
    const saveSaveSelectedLocation = localStorage.getItem("saveSelectedLocation");
    const savedCurrencyConversion = localStorage.getItem("currencyConversion");
    const savedLocation = localStorage.getItem("userLocation");
    const savedFromCurrency = localStorage.getItem("fromCurrency");
    const updateLocation = localStorage.getItem("updateLocation");

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
    if (updateLocation) {
      setUpdateLocationInNewExpenses(JSON.parse(updateLocation));
    }

  }, []);

  const handleSaveSelectedLocation = (saveSelectedLocation: boolean) => {
    setSaveSelectedLocation(saveSelectedLocation);
    localStorage.setItem("saveSelectedLocation", JSON.stringify(saveSelectedLocation));
  }

  const handleCurrencyConversion = (currencyConversion: boolean) => {
    setCurrencyConversion(currencyConversion);
    localStorage.setItem("currencyConversion", JSON.stringify(currencyConversion));
  }

  const handleFromCurrency = (fromCurrency: string) => {
    setFromCurrency(fromCurrency);
    localStorage.setItem("fromCurrency", fromCurrency);
  }

  const handleUpdateLocationInNewExpenses = (updateLocationInNewExpenses: boolean) => {
    setUpdateLocationInNewExpenses(updateLocationInNewExpenses);
    localStorage.setItem("updateLocation", JSON.stringify(updateLocationInNewExpenses));
  }

  const handleGpsEnabled = (gpsEnabled: boolean) => {
    setGpsEnabled(gpsEnabled);
    localStorage.setItem("gpsEnabled", JSON.stringify(gpsEnabled));
  }

  const filteredFromCurrencies = currencies.filter((c) =>
      c.toLowerCase().includes(searchFrom.toLowerCase())
  );

  return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <DataManagement />
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
              <NewTripForm/>
              <Card>
                <h3 className="text-lg font-semibold mb-4 p-2">Your Trips</h3>
                <TripList />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-4">
              {/* GPS Switch */}
              <div className="flex items-center justify-between mb-6 font-bold">
                <span>Enable GPS tracking</span>
                <Switch checked={gpsEnabled} onCheckedChange={handleGpsEnabled}/>
              </div>
              {gpsEnabled && location.city && (
                  <p className="mt-2 text-sm text-gray-600">
                    Current location: {location.city}, {location.country.toUpperCase()}
                  </p>
              )}

              {/* Update Location Switch */}
              {gpsEnabled && (
                  <div className="flex items-center justify-between mt-6 mb-4 font-bold">
                    <span>Update location every time a new expense is created</span>
                    <Switch checked={updateLocationInNewExpenses} onCheckedChange={handleUpdateLocationInNewExpenses}/>
                  </div>
              )}

              {/* Save location Switch */}
              <div className="flex items-center justify-between mt-6 mb-4 font-bold">
                <span>Save last location</span>
                <Switch checked={saveSelectedLocation} onCheckedChange={handleSaveSelectedLocation}/>
              </div>
              {saveSelectedLocation && (
              <p className="mt-2 text-sm text-gray-600">
                If you enable this, your last selected location will be saved. Ether on new expense or by searching for
                a location in new expense
              </p>
              )}

              {/* Currency Conversion Switch */}
              <div className="mt-6 flex items-center justify-between font-bold">
                <span>Allow price conversions</span>
                <Switch
                    checked={currencyConversion}
                    onCheckedChange={handleCurrencyConversion}
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
                                      handleFromCurrency(c);
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
                        Currency: {currentCurrencySymbol()}</label>
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
