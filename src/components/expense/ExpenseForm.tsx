import { useState, useEffect } from "react";
import { ExpenseFormData } from "@/types/expense";
import { toast } from "sonner";
import { ExpenseDetails } from "../expense/ExpenseDetails";
import { DateRange } from "react-day-picker";
import { Categories } from "@/types/category";
import { defaultCategories } from "@/config/defaultCategories";
import { DialogTitle } from "@/components/ui/dialog";
import { useTrip } from "@/contexts/TripContext";
import { ExpenseCategoryStep } from "../expense/ExpenseCategoryStep";

interface ExpenseFormProps {
  onSuccess?: () => void;
  expense?: ExpenseFormData & { id: string };
}

const INITIAL_FORM_STATE: ExpenseFormData = {
  name: "",
  amount: 0,
  currency: "EUR",
  date: new Date().toISOString().split('T')[0],
  // @ts-ignore
  endDate: new Date().toISOString().split('T')[0],
  categoryId: "",
  description: "",
  country: "",
  location: "",
  tags: [],
  latitude: null,
  longitude: null,
  excludeFromAvg: false,
};

export function ExpenseForm({ onSuccess, expense }: ExpenseFormProps) {
  const { currentTripData } = useTrip();
  const [formData, setFormData] = useState<ExpenseFormData>(() => {
    const savedLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
    return expense ? {
      ...expense,
      date: expense.date,
      endDate: expense.endDate || expense.date
    } : {
      ...INITIAL_FORM_STATE,
      currency: currentTripData?.currency || 'EUR',
      country: savedLocation.country || '',
      location: savedLocation.city || '',
      latitude: savedLocation.latitude || null,
      longitude: savedLocation.longitude || null,
    };
  });

  const [step, setStep] = useState<'category' | 'details'>(expense ? 'details' : 'category');
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (expense) {
      const to = expense.date === expense.endDate ? undefined : (expense.endDate ? new Date(expense.endDate) : new Date(expense.date));
      return {
        from: new Date(expense.date),
        to: to
      };
    }
    const today = new Date();
    return {
      from: today,
      to: undefined
    };
  });

  const [categories, setCategories] = useState<Categories>(defaultCategories);

  useEffect(() => {
    if (currentTripData?.currency) {
      setFormData(prev => ({
        ...prev,
        currency: currentTripData.currency
      }));
    }
  }, [currentTripData?.currency]);

  useEffect(() => {
    const currentTripId = localStorage.getItem('selectedTripId');
    const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');
    const currentTrip = tripsData.find((t: any) => t.id === currentTripId);

    if (currentTrip?.categories) {
      setCategories(currentTrip.categories);
    } else {
      setCategories(defaultCategories);
    }
  }, []);

  const handleUpdateCategories = (newCategories: Categories) => {
    const currentTripId = localStorage.getItem('selectedTripId');
    const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');

    const updatedTrips = tripsData.map((t: any) => {
      if (t.id === currentTripId) {
        return {
          ...t,
          categories: newCategories
        };
      }
      return t;
    });

    localStorage.setItem('trips', JSON.stringify(updatedTrips));
    setCategories(newCategories);
  };

  function toLocalDateString(date: Date) {
    // Adjust by the user's timezone offset (in minutes)
    const offsetMs = date.getTimezoneOffset() * 60_000;
    // Create a new Date shifted so that it "becomes" local midnight
    const localMidnight = new Date(date.getTime() - offsetMs);
    // Now take the YYYY-MM-DD part
    return localMidnight.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (date?.from) {
      // @ts-ignore
      setFormData(prev => ({
        ...prev,
        date: date.from ? toLocalDateString(date.from) : prev.date,
        endDate: date.to ? toLocalDateString(date.to) : toLocalDateString(date.from!),
      }));
    }
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error("Please enter an amount");
      return;
    }

    if (!date?.from) {
      toast.error("Please select a date");
      return;
    }

    formData.amount = +formData.amount.toFixed(2)
    const currentTrip = localStorage.getItem('selectedTripId');
    const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');
    let formDataWithId = {};
    let updatedTrips = {};

    if (expense?.id) {
      const expenses = tripsData.find((t: any) => t.id === currentTrip).expenses;
      const existingIndex = expenses.findIndex((e: any) => e.id === expense.id);

      updatedTrips = tripsData.map((trip: any) => {
        if (trip.id === currentTrip) {
          return {
            ...trip,
            expenses: expenses.map((e: any, index: number) =>
                index === existingIndex ? formData : e // Replace at the same index
            ),
          };
        }
        return trip;
      });

    } else {
      const id = Date.now().toString();
      formDataWithId = {
        ...formData,
        id,
      };
      updatedTrips = tripsData.map((trip: any) => {
        if (trip.id === currentTrip) {
          return {
            ...trip,
            expenses: [formDataWithId, ...trip.expenses],
          };
        }
        return trip;
      });
    }

    localStorage.setItem('trips', JSON.stringify(updatedTrips));

    window.dispatchEvent(new Event('storageChange'));

    toast.success("Expense added successfully!");

    setFormData(prev => ({
      ...INITIAL_FORM_STATE,
      currency: prev.currency,
      country: prev.country,
      location: prev.location,
      latitude: prev.latitude,
      longitude: prev.longitude,
    }));
    setStep('category');
    setDate(undefined);
    onSuccess?.();
  };

  if (step === 'category') {
    return (
        <ExpenseCategoryStep
            selectedCategory={formData.categoryId}
            onSelectCategory={(categoryId) => {
              setFormData(prev => ({ ...prev, categoryId }));
              setStep('details');
            }}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
            isEdit={!!expense}
        />
    );
  }

  return (
      <>
        <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        <ExpenseDetails
            formData={formData}
            onFormDataChange={(changes) => setFormData(prev => ({ ...prev, ...changes }))}
            date={date}
            onDateChange={setDate}
            isEdit={!!expense}
            onBack={() => setStep('category')}
            onSubmit={handleSubmit}
        />
      </>
  );
}
