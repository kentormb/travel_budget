import React, { useState } from "react";
import { getCurrencySymbol } from "@/utils/helpers";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SubItem {
    name: string;
    totalAmount: number;
}

interface CategoryItem {
    categoryId: string;
    categoryName: string;
    categoryAmount: number;
    subItems: SubItem[];
}

interface CategoryBreakdownProps {
    data: CategoryItem[];
    currency: string;
}

/**
 * Renders a collapsible list of categories.
 * Each category can be expanded to show the distinct expense names within that category,
 * along with the total spent on each name.
 */
export function CategoryBreakdown({ data, currency }: CategoryBreakdownProps) {
    // Keep track of which categories are expanded
    // We store categoryIds in a Set for easy add/remove
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    function toggleExpand(categoryId: string) {
        setExpanded((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    }

    return (
        <div className="space-y-4">
            {data.map(({ categoryId, categoryName, categoryAmount, subItems }) => {
                const isOpen = expanded.has(categoryId);

                return (
                    <div
                        key={categoryId}
                        className="border bg-gray-50 rounded-md shadow-sm"
                    >
                        {/* Category Header */}
                        <button
                            type="button"
                            onClick={() => toggleExpand(categoryId)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition"
                        >
                            <div className="flex items-center space-x-3">
                                {/* Expand/Collapse Icon */}
                                {isOpen ? (
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                ) : (
                                    <ChevronRight className="h-5 w-5 text-gray-500" />
                                )}
                                <span className="font-semibold text-gray-800">
                  {categoryName}
                </span>
                            </div>
                            <span className="text-gray-700 font-semibold">
                {categoryAmount.toFixed(2)} {getCurrencySymbol(currency)}
              </span>
                        </button>

                        {/* Sub-list (Collapsible) */}
                        {isOpen && (
                            <div className="px-4 pb-3 transition-all">
                                <ul className="mt-2 space-y-2">
                                    {subItems.map((item) => (
                                        <li
                                            key={item.name}
                                            className="flex justify-between items-center bg-white rounded-md px-4 py-2 shadow-sm"
                                        >
                      <span className="text-gray-600 font-medium">
                        {item.name}
                      </span>
                                            <span className="text-gray-900 font-semibold">
                        {item.totalAmount.toFixed(2)}{" "}
                                                {getCurrencySymbol(currency)}
                      </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
