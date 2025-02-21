import React from "react";
import { getCurrencySymbol } from "@/utils/helpers";

interface MonthEntry {
    month: string;
    amount: number;
}

interface YearlyExpensesBreakdownProps {
    // { "2024": [{ month: "Jan", amount: 200 }, ...], "2025": [...] }
    groupedByYear: {
        [year: string]: MonthEntry[];
    };
    currency: string;
}

export function YearlyExpensesBreakdown({
                                            groupedByYear,
                                            currency,
                                        }: YearlyExpensesBreakdownProps) {
    return (
        <div className="mt-6 space-y-4">
            {Object.entries(groupedByYear).map(([year, months]) => (
                <div key={year} className="p-4 bg-gray-100 rounded-lg">
                    {/* Year Heading */}
                    <h4 className="text-lg font-bold text-gray-700 mb-2">{year}</h4>

                    {/* Month-wise Expenses */}
                    <ul className="space-y-2">
                        {months.map(({ month, amount }) => (
                            <li
                                key={month}
                                className="flex justify-between px-4 py-2 bg-white rounded-md shadow-sm"
                            >
                                <span className="text-gray-600 font-medium">{month}</span>
                                <span className="text-gray-900 font-semibold">
                  {amount} {getCurrencySymbol(currency)}
                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
