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
import { backupToGoogleDrive } from "@/components/settings/GoogleDriveSync";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Check for currency conversion settings
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

    // Check if we need to back up to Google Drive
    const lastBackupDate = localStorage.getItem("lastGoogleDriveBackup");
    const saveDailyToCloud = localStorage.getItem("saveDailyToCloud") === "true";
    const googleDriveToken = localStorage.getItem("googleDriveToken");
    
    if (saveDailyToCloud && googleDriveToken) {
      const now = new Date();
      const shouldBackup = !lastBackupDate || 
                          differenceInDays(now, new Date(lastBackupDate)) >= 1;
      
      if (shouldBackup) {
        // Add a delay to ensure everything is loaded
        setTimeout(() => {
          try {
            // Add script for Google API
            const script = document.createElement("script");
            script.src = "https://apis.google.com/js/api.js";
            script.async = true;
            script.defer = true;
            script.onload = () => {
              window.gapi.load("client", async () => {
                try {
                  await window.gapi.client.init({
                    apiKey: "AIzaSyDeD0_VIy2_ALNoaa71cMYLSQJcPbURzo4",
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                  });
                  
                  // Once API is initialized, trigger the backup
                  backupToGoogleDrive();
                } catch (error) {
                  console.error("Error initializing Google API:", error);
                }
              });
            };
            document.head.appendChild(script);
          } catch (error) {
            console.error("Failed to backup to Google Drive:", error);
          }
        }, 5000); // 5 seconds delay
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
