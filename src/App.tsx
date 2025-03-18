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
import AuthCallback from "./pages/AuthCallback";
import { TripProvider } from "./contexts/TripContext";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const savedCurrencyConversion = localStorage.getItem("currencyConversion");
    if (savedCurrencyConversion && JSON.parse(savedCurrencyConversion) === true) {
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
                <Route path="/auth-callback" element={<AuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TripProvider>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
