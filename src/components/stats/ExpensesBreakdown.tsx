import React from "react";
import { getCurrencySymbol, formatWithCommas } from "@/utils/helpers";
import { TimeEntry } from "./TimeBasedExpensesChart";

interface ExpensesBreakdownProps {
    data: TimeEntry[];
    currency: string;
    timeUnit: string;
}

export function ExpensesBreakdown({
                                      data,
                                      currency,
                                      timeUnit
                                  }: ExpensesBreakdownProps) {
    const currencySymbol = getCurrencySymbol(currency);

    // Group data by parent unit (year, month, etc.) if available
    const groupedData = React.useMemo(() => {
        // Determine grouping key based on timeUnit
        let groupKey = 'year';
        if (timeUnit === 'Daily') groupKey = 'month';
        else if (timeUnit === 'Weekly') groupKey = 'month';
        else if (timeUnit === 'Monthly') groupKey = 'year';

        return data.reduce((acc, entry) => {
            const key = entry[groupKey] || 'Ungrouped';
            if (!acc[key]) acc[key] = [];
            acc[key].push(entry);
            return acc;
        }, {});
    }, [data, timeUnit]);

    // Calculate total amount
    const totalAmount = React.useMemo(() =>
            data.reduce((sum, entry) => sum + entry.amount, 0)
        , [data]);

    return (
        <div className="mt-6 space-y-4">
            {Object.entries(groupedData).map(([groupName, entries]) => (
                <div key={groupName} className="p-4 bg-gray-100 rounded-lg">
                    {/* Group Heading */}
                    <h4 className="text-lg font-bold text-gray-700 mb-2">{groupName}</h4>

                    {/* Individual Entries */}
                    <ul className="space-y-2">
                        {entries.map((entry: TimeEntry, index) => (
                            <li
                                key={`${entry.label}-${index}`}
                                className="flex justify-between px-4 py-2 bg-white rounded-md shadow-sm"
                            >
                                <span className="text-gray-600 font-medium">{entry.label}</span>
                                <span className="text-gray-900 font-semibold">
                                    { formatWithCommas(entry.amount.toString(), false) } {currencySymbol}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
