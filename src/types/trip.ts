
import { Expense } from './expense';
import { Categories } from './category';

export interface Trip {
  id: string;
  name: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  expenses: Expense[];
  photo?: string;
  categories: Categories;
  currency: string;
  dailyBudget?: number;
  totalBudget?: number;
}
