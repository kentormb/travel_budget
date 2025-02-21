import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { TripProvider } from "./contexts/TripContext";
import { getUserLocation } from "@/utils/helpers";
import { LocationData } from "@/types/location.ts";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const gpsEnabled = localStorage.getItem("gpsEnabled");
    const savedLocation = localStorage.getItem("userLocation");
    const defaultLocationData = {
      latitude: null,
      longitude: null,
      country: "",
      city: "",
      updated_at: new Date(),
    };
    if (gpsEnabled && gpsEnabled === "true") {
      const lastUpdated = savedLocation
          ? new Date(JSON.parse(savedLocation).updated_at)
          : null;
      const moreThanOneDayPassed = differenceInDays(new Date(), lastUpdated) > 1;

      if (!savedLocation || moreThanOneDayPassed) {
        getUserLocation()
            .then((locationData: LocationData) => {
              localStorage.setItem("userLocation", JSON.stringify(locationData));
            })
            .catch((error) => {
              toast.error("Could not determine location");
              if (!savedLocation) {
                localStorage.setItem("userLocation", JSON.stringify({
                  latitude: null,
                  longitude: null,
                  country: "",
                  city: "",
                  updated_at: new Date(),
                }));
              }
            });
      }
    } else {
      if (!savedLocation) {
        localStorage.setItem("userLocation", JSON.stringify(defaultLocationData));
      }
      localStorage.setItem("gpsEnabled", "false");
    }

    const savedCurrencyConversion = localStorage.getItem("currencyConversion");
    // If user allows currency conversion
    if (savedCurrencyConversion && JSON.parse(savedCurrencyConversion) === true) {
      // We'll fetch the currency data in the background if needed
      const fetchCurrencyRates = async () => {
        try {
          const response = await fetch(
              "https://cv.marios.com.gr/converter/rates.php"
          );
          if (!response.ok) {
            throw new Error("Failed to fetch currency rates");
          }
          const data = await response.json();
          localStorage.setItem(
              "currencyRates",
              JSON.stringify({
                timestamp: new Date(),
                rates: data,
              })
          );
        } catch (err) {
          console.error("Error fetching currency rates:", err);
          toast.error("Could not fetch currency rates.");
        }
      };

      const storedRates = localStorage.getItem("currencyRates");
      if (!storedRates) {
        fetchCurrencyRates().then();
      } else {
        const parsedRates = JSON.parse(storedRates);
        const lastUpdate = parsedRates?.timestamp
            ? new Date(parsedRates.timestamp)
            : null;
        // If more than 24 hours passed, fetch new rates
        if (!lastUpdate || differenceInDays(new Date(), lastUpdate) >= 1) {
          fetchCurrencyRates().then();
        }
      }
    }
  }, []);

  return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TripProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TripProvider>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
