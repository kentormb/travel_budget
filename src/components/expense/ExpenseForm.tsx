import { useState, useEffect, useCallback, useMemo } from "react";
import { ExpenseFormData } from "@/types/expense";
import { toast } from "sonner";
import { ExpenseDetails } from "../expense/ExpenseDetails";
import { DateRange } from "react-day-picker";
import { Categories } from "@/types/category";
import { defaultCategories } from "@/config/defaultCategories";
import { DialogTitle } from "@/components/ui/dialog";
import { useTrip } from "@/contexts/TripContext";
import { ExpenseCategoryStep } from "../expense/ExpenseCategoryStep";
import { initializeAutomaticBackup } from "@/components/settings/GoogleDriveSync";

interface ExpenseFormProps {
  onSuccess?: () => void;
  expense?: ExpenseFormData & { id: string };
}

const INITIAL_FORM_STATE: ExpenseFormData = {
  name: "",
  amount: 0,
  currency: "EUR",
  date: new Date().toISOString().split('T')[0],
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

function toLocalDateString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localMidnight = new Date(date.getTime() - offsetMs);
  return localMidnight.toISOString().split('T')[0];
}

export function ExpenseForm({ onSuccess, expense }: ExpenseFormProps) {
  const { currentTripData } = useTrip();

  const initialFormState = useMemo(() => {
    const savedLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');

    if (expense) {
      return {
        ...expense,
        date: expense.date,
        endDate: expense.endDate || expense.date
      };
    }

    return {
      ...INITIAL_FORM_STATE,
      currency: currentTripData?.currency || 'EUR',
      country: savedLocation.country || '',
      location: savedLocation.city || '',
      latitude: savedLocation.latitude || null,
      longitude: savedLocation.longitude || null,
    };
  }, [expense, currentTripData?.currency]);

  const [formData, setFormData] = useState<ExpenseFormData>(initialFormState);
  const [step, setStep] = useState<'category' | 'details'>(expense ? 'details' : 'category');

  const [categories, setCategories] = useState<Categories>(() => {
    try {
      const currentTripId = localStorage.getItem('selectedTripId');
      const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');
      const currentTrip = tripsData.find((t: any) => t.id === currentTripId);
      return currentTrip?.categories || defaultCategories;
    } catch (e) {
      return defaultCategories;
    }
  });

  const initialDateRange = useMemo(() => {
    if (expense) {
      const to = expense.date === expense.endDate
          ? undefined
          : (expense.endDate ? new Date(expense.endDate) : new Date(expense.date));
      return {
        from: new Date(expense.date),
        to
      };
    }

    return {
      from: new Date(),
      to: undefined
    };
  }, [expense]);

  const [date, setDate] = useState<DateRange | undefined>(initialDateRange);

  const handleUpdateCategories = useCallback((newCategories: Categories) => {
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
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setFormData(prev => ({ ...prev, categoryId }));
    setStep('details');
  }, []);

  const handleFormDataChange = useCallback((changes: Partial<ExpenseFormData>) => {
    setFormData(prev => ({ ...prev, ...changes }));
  }, []);

  const isEdit = useMemo(() => !!expense, [expense]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount) {
      setTimeout(() => toast.error("Please enter an amount"), 0); // Delay toast execution
      return;
    }

    if (!date?.from) {
      setTimeout(() => toast.error("Please select a date"), 0);
      return;
    }

    const formattedAmount = +formData.amount.toFixed(2);
    const submitData = { ...formData, amount: formattedAmount };

    const currentTripId = localStorage.getItem("selectedTripId");
    const tripsData = JSON.parse(localStorage.getItem("trips") || "[]");
    let updatedTrips;

    if (expense?.id) {
      // Edit existing expense
      updatedTrips = tripsData.map((trip: any) => {
        if (trip.id === currentTripId) {
          return {
            ...trip,
            expenses: trip.expenses.map((e: any) =>
                e.id === expense.id ? submitData : e
            ),
          };
        }
        return trip;
      });
    } else {
      // Add new expense
      const newExpense = { ...submitData, id: Date.now().toString() };
      updatedTrips = tripsData.map((trip: any) => {
        if (trip.id === currentTripId) {
          return {
            ...trip,
            expenses: [newExpense, ...trip.expenses],
          };
        }
        return trip;
      });
    }

    localStorage.setItem("trips", JSON.stringify(updatedTrips));
    window.dispatchEvent(new Event("storageChange"));
    toast.success("Expense saved successfully!");

    setFormData({
      ...INITIAL_FORM_STATE,
      currency: formData.currency,
      country: formData.country,
      location: formData.location,
      latitude: formData.latitude,
      longitude: formData.longitude,
    });
    setStep("category");
    setDate(undefined);

    initializeAutomaticBackup();

    onSuccess?.();
  }, [formData, date, expense, onSuccess]);

  useEffect(() => {
    if (currentTripData?.currency) {
      setFormData(prev => {
        // Only update if different to prevent unnecessary re-renders
        if (prev.currency !== currentTripData.currency) {
          return {
            ...prev,
            currency: currentTripData.currency
          };
        }
        return prev;
      });
    }
  }, [currentTripData?.currency]);

  useEffect(() => {
    if (date?.from) {
      setFormData(prev => {
        const newDate = toLocalDateString(date.from);
        const newEndDate = date.to ? toLocalDateString(date.to) : newDate;

        // Only update if different to prevent unnecessary re-renders
        if (prev.date !== newDate || prev.endDate !== newEndDate) {
          return {
            ...prev,
            date: newDate,
            endDate: newEndDate,
          };
        }
        return prev;
      });
    }
  }, [date]);

  const categoryStepProps = useMemo(() => ({
    selectedCategory: formData.categoryId,
    onSelectCategory: handleCategorySelect,
    categories,
    onUpdateCategories: handleUpdateCategories,
    isEdit
  }), [formData.categoryId, handleCategorySelect, categories, handleUpdateCategories, isEdit]);

  const detailsProps = useMemo(() => ({
    formData,
    onFormDataChange: handleFormDataChange,
    date,
    onDateChange: setDate,
    isEdit,
    onBack: () => setStep('category'),
    onSubmit: handleSubmit
  }), [formData, handleFormDataChange, date, setDate, isEdit, handleSubmit]);

  if (step === 'category') {
    return (
        <>
          <DialogTitle></DialogTitle>
          <ExpenseCategoryStep {...categoryStepProps} />
        </>
    );
  }

  return (
      <>
        <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        <ExpenseDetails {...detailsProps} />
      </>
  );
}
