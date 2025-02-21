import * as Icons from "lucide-react";
import { Trash2 } from "lucide-react";

interface ExpenseItemProps {
  expense: any;
  category: any;
  onEdit: (expense: any) => void;
  onDelete: (id: string) => void;
  isDateInFuture: boolean;
}

export function ExpenseItem({ expense, category, onEdit, onDelete, isDateInFuture }: ExpenseItemProps) {
  const Icon = Icons[category?.icon] || Icons.CircleDollarSign;
  const displayName = expense.name || category?.name || 'Expense';

  return (
      <div
          className={`flex items-center justify-between mb-2 hover:bg-muted/50 rounded-lg transition-colors expense-item ${
              isDateInFuture ? 'opacity-30' : ''
          }`}
      >
        <div  className="flex items-center gap-2 w-full justify-between" onClick={() => onEdit(expense)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center ar-1"
                 style={{backgroundColor: category?.color}}>
              <Icon className="h-4 w-4" style={{color: "white"}}/>
            </div>
            <div>
              <p className="text-base font-medium">{displayName}</p>
              {expense.description && (
                  <p className="text-xs text-muted-foreground">{expense.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={"text-base font-medium" + (expense.excludeFromAvg ? ' line-through': '')}>
                {expense.amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <button
            onClick={() => onDelete(expense.id)}
            className="pl-2 hover:bg-red-100 rounded-full opacity-50"
        >
          <Trash2 className="h-4 w-4 text-red-500"/>
        </button>
      </div>
  );
}
