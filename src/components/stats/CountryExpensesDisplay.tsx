import React from "react";
import { getCurrencySymbol } from "@/utils/helpers";

interface CountryExpense {
    country: string;
    flag: string;
    totalSpent: number;
    totalBudget: number;
    days: number;
}

interface Props {
    data: CountryExpense[];
    currency: string;
    svgRef: React.RefObject<SVGSVGElement>;
}

export const CountryExpensesDisplay: React.FC<Props> = ({ data, currency, svgRef }) => {
    return (
        <div>
            {/* List of Countries */}
            <div className="mt-6 space-y-4">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md"
                    >
                        {/* Left: Flag and Country Info */}
                        <div className="flex items-center gap-2">
                            <img
                                src={item.flag}
                                alt={item.country}
                                className="w-5 h-5 rounded-full"
                            />
                            <div>
                                <div className="text-lg font-semibold">{item.country}</div>
                                <div className="text-sm text-gray-500">
                                    {item.days} day{item.days > 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>

                        {/* Right: Budget and Spent */}
                        <div className="flex gap-6">
                            <div className="text-right">
                                <div className="text-green-500 font-bold text-sm">Budget</div>
                                <div className="font-medium">
                                    {item.totalBudget.toFixed(0)} {getCurrencySymbol(currency)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-yellow-500 font-bold text-sm">Spent</div>
                                <div className="font-medium">
                                    {item.totalSpent.toFixed(0)} {getCurrencySymbol(currency)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
