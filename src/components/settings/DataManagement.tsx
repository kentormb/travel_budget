
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Trip } from "@/types/trip";
import { format } from "date-fns";

interface DataManagementProps {
  trips: Trip[];
}

export function DataManagement({ trips }: DataManagementProps) {

  const handleExportJSON = () => {
    const tripsData = localStorage.getItem("trips");

    // 1. Check if there is any trips data in localStorage
    if (!tripsData) {
      toast.error("No trips data to export");
      return;
    }

    // 2. Create a Blob from the raw trips data
    const fileData = new Blob([tripsData], { type: "application/json" });
    const fileUrl = URL.createObjectURL(fileData);

    // 3. Create a temporary link element and trigger the download
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = "trips_backup.json"; // Name of the file to be downloaded
    document.body.appendChild(link);
    link.click();

    // 4. Clean up and show success toast
    document.body.removeChild(link);
    URL.revokeObjectURL(fileUrl);
    toast.success("Trips data exported successfully!");
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        const existingTrips = JSON.parse(localStorage.getItem("trips"));
        const jsonData = JSON.parse(text);

        let itemsCount = 0;
        jsonData.map(item => {
          if (item?.id && item?.name && item?.expenses) {
            itemsCount++;
          }
        });

        if (itemsCount === 0) {
          throw new Error("Invalid JSON format: no trips found in array");
        }

        if (existingTrips) {
          jsonData.map(item => {
            existingTrips.push(item)
          });
          localStorage.setItem("trips", JSON.stringify(existingTrips));
        } else {
          localStorage.setItem("trips", JSON.stringify(jsonData));
        }

        toast.success(" Trips have been imported successfully!");

        window.dispatchEvent(new Event('storageChange'));

      } catch (error) {
        console.error("Import error:", error);
        toast.error("Error importing data. Please check the file format.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex gap-4">
      <Button onClick={handleExportJSON} className="flex items-center gap-2">
        <Download className="h-4 w-4" />
      </Button>
      <div className="relative">
        <input
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Button className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
