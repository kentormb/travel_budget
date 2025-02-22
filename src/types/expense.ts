
export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Expense = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  endDate?: Date;
  categoryId: string;
  description: string;
  country?: string;
  location?: string;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  excludeFromAvg?: boolean;
  photo?: string;
};

export type ExpenseFormData = Omit<Expense, 'id' | 'date'> & {
  date: string;
  endDate?: string;
  country?: string;
};

export interface ExpenseListProps {
  query?: string;
}
