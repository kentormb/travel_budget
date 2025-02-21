// ExpensesByLocation.tsx
import React from "react";

interface Expense {
    amount: number;
    location?: string;
}

interface GroupedLocation {
    location: string;
    count: number;
    total: number;
}

interface ExpensesByLocationProps {
    expenses: Expense[];
}

export function ExpensesByLocation({ expenses }: ExpensesByLocationProps) {
    // Group by location (if no location provided, use "Unknown")
    const grouped = expenses.reduce<Record<string, GroupedLocation>>((acc, exp) => {
        const loc = exp.location?.trim() || "Unknown";
        if (!acc[loc]) {
            acc[loc] = { location: loc, count: 0, total: 0 };
        }
        acc[loc].count += 1;
        acc[loc].total += exp.amount;
        return acc;
    }, {});

    const groups = Object.values(grouped);

    return (
        <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Expenses by Location</h3>
            <ul className="divide-y divide-gray-200">
                {groups.map((group) => (
                    <li key={group.location} className="flex justify-between py-2">
                        <span>{group.location}</span>
                        <span>
                          {group.count} expense{group.count > 1 ? "s" : ""}, {group.total.toFixed(2)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
