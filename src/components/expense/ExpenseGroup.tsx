import { isToday, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { ExpenseItem } from "./ExpenseItem";
import { getCategories, getRelativeDateLabel } from "@/utils/helpers";

interface ExpenseGroupProps {
    date: string;
    expenses: any[];
    onEdit: (expense: any) => void;
    onDelete: (id: string) => void;
    isFutureDate: (date: string) => boolean;
}

export function ExpenseGroup({ date, expenses, onEdit, onDelete, isFutureDate }: ExpenseGroupProps) {
    const totalWithExcluded = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const totalWithoutExcluded = expenses.reduce((sum: number, exp: any) => exp.excludeFromAvg ? sum : sum + exp.amount, 0);
    const isDateInFuture = isFutureDate(date);
    // Create a ref for this section
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

    }, []);

    useEffect(() => {
        // Check if this is the "today" section
        if (isToday(parseISO(date)) && sectionRef.current) {
            sectionRef.current.scrollIntoView({ block: "start" });
        }
    }, [date]); // Run this effect when the date changes

    return (
        <div ref={sectionRef} className="mb-3">
            <div
                className={`sticky top-0 px-3 py-1 border-b z-10 rounded-md border mb-[5px] ${
                    isDateInFuture ? "text-gray-200 border-gray-100 bg-gray-50" : "border-gray-300 bg-gray-50"
                }`}
            >
                <div className={`flex justify-between items-center ${
                    isDateInFuture ? "text-gray-400" : "text-gray-500"
                }`}>
                    <div>
                        <h3 className="text-base font-medium">{getRelativeDateLabel(date)}</h3>
                    </div>
                    <p className="text-base font-medium">
                        {totalWithoutExcluded.toFixed(2)}
                        {totalWithoutExcluded !== totalWithExcluded && ` (${totalWithExcluded.toFixed(2)})`}
                    </p>
                </div>
            </div>
            <div className="space-y-1">
                {expenses.map((expense: any, i: any) => {
                    const category = getCategories()[expense.categoryId];
                    return (
                        expense.id && (
                            <ExpenseItem
                                key={`${expense.id}-${i}`}
                                expense={expense}
                                category={category}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                isDateInFuture={isDateInFuture}
                            />
                        )
                    );
                })}
            </div>
        </div>
    );
}
