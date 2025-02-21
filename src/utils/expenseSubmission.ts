import { ExpenseFormData } from "@/types/expense";
import { toast } from "sonner";

export function handleExpenseSubmission(
  formData: ExpenseFormData,
  expense?: ExpenseFormData & { id: string }
): boolean {
  console.log('Starting expense submission with data:', formData);

  if (!formData.amount) {
    toast.error("Please enter an amount");
    return false;
  }

  const currentTripId = localStorage.getItem('selectedTripId');
  if (!currentTripId) {
    toast.error("No trip selected");
    return false;
  }

  const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');

  const currentTrip = tripsData.find((t: any) => t.id === currentTripId);

  if (!currentTrip) {
    toast.error("Selected trip not found");
    return false;
  }

  const updatedTrips = tripsData.map((trip: any) => {
    if (trip.id === currentTripId) {
      let updatedExpenses = [...(trip.expenses || [])];

      if (expense) {
        // Remove old expense entries
        updatedExpenses = updatedExpenses.filter((e: any) => !e.id.startsWith(expense.id));
      }

      return {
        ...trip,
        expenses: [...updatedExpenses, formData]
      };
    }
    return trip;
  });

  console.log('Updated trips data before saving:', updatedTrips);
  localStorage.setItem('trips', JSON.stringify(updatedTrips));

  // Dispatch both storage events to ensure all components update
  window.dispatchEvent(new Event('storageChange'));

  toast.success("Expense added successfully!");

  return true;
}
