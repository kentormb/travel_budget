import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { useTrip } from "@/contexts/TripContext";
import { toast } from "sonner";
import { ExpenseGroup } from "./expense/ExpenseGroup";
import {isFutureDate, dailyAverageLabels, splitExpenses} from "@/utils/helpers";
import { ExpenseListProps } from "@/types/expense";

const groupExpensesByDate = (expenses: any[]) => {
  const groups: { [key: string]: any[] } = {};
  const seperatedExpenses = splitExpenses(expenses);

  seperatedExpenses.forEach(expense => {
    const dateKey = expense.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(expense);
  });
  return groups;
};

export function ExpenseList({ query }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const { currentTripData } = useTrip();
  const [avg, setAvg] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkStorageChanges = () => {
    const currentTripId = localStorage.getItem('selectedTripId');
    if (currentTripId) {
      const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');
      const currentTrip = tripsData.find((trip: any) => trip.id === currentTripId);
      if (currentTrip?.expenses) {
        const sortedExpenses = [...currentTrip.expenses].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setExpenses(sortedExpenses);
      }
    }
  };

  const handleStorageChange = () => {
    checkStorageChanges();
  };

  useEffect(() => {
    setLoading(true);
    if (currentTripData) {
      setAvg(dailyAverageLabels(currentTripData));
    }
    if (currentTripData?.expenses) {
      const sortedExpenses = [...currentTripData.expenses].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setExpenses(sortedExpenses);
    } else {
      setExpenses([]);
    }
    setLoading(false);
  }, [currentTripData]);

  useEffect(() => {
    window.addEventListener('storageChange', handleStorageChange);
    handleStorageChange();

    return () => {
      window.removeEventListener('storageChange', handleStorageChange);
    }
  }, []);

  const handleDeleteExpense = (expenseId: string) => {
    const userConfirmed = window.confirm(
        "Are you sure you want to delete this expense?"
    );
    if (!userConfirmed) {
      return; // If user cancels, do nothing further
    }
    const currentTripId = localStorage.getItem('selectedTripId');
    const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');

    const updatedTrips = tripsData.map((trip: any) => {
      if (trip.id === currentTripId) {

        return {
          ...trip,
          expenses: (trip.expenses || []).filter((e: any) => e.id !== expenseId)
        };
      }
      return trip;
    });

    localStorage.setItem('trips', JSON.stringify(updatedTrips));
    window.dispatchEvent(new Event('storageChange'));
    toast.success("Expense deleted successfully");
  };

  const handleEditExpense = (expense: any) => {
    const exp = expenses.find((e: any) => e.id === expense.id);
    setEditingExpense({
      ...exp
    });
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  if (expenses.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <p>No expenses yet</p>
        <p className="text-sm">Add your first expense using the + button below</p>
      </div>
    );
  }

  const groupedExpenses = groupExpensesByDate(expenses);
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
      <>
        {avg &&
            <div className="w-full bg-gray-100 p-4 rounded-md mb-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">Daily Average</p>
                  <p className="text-base font-semibold">{avg.dailyAverage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Daily Budget</p>
                  <p className="text-base font-semibold">{avg.dailyBudget}</p>
                </div>
              </div>

              <div className="relative w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                <div className={"absolute top-0 left-0 h-full " + avg.color} style={{width: avg.percentage}}>
                </div>
              </div>
            </div>
        }

        <ScrollArea className="expenses-scroll-container w-full rounded-md">
          {sortedDates
              .map((date) => {
                let filteredExpenses = groupedExpenses[date];
                if (query) {
                  filteredExpenses = groupedExpenses[date].filter((expense) =>
                      expense.name.toLowerCase().includes(query.toLowerCase())
                  );
                  if (filteredExpenses.length === 0) return null;
                }
                return (
                    <ExpenseGroup
                        key={date}
                        date={date}
                        expenses={filteredExpenses}
                        onEdit={handleEditExpense}
                        onDelete={handleDeleteExpense}
                        isFutureDate={isFutureDate}
                    />
                );
              })}
        </ScrollArea>

        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="max-w-md max-h-screen h-full sm:h-auto overflow-y-auto">
            <ExpenseForm
                expense={editingExpense}
                onSuccess={() => {
                  setEditingExpense(null);
                }}
            />
          </DialogContent>
        </Dialog>
      </>
  );
}
