import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeBasedExpensesChart, TimeEntry } from "./TimeBasedExpensesChart";
import { ExpensesBreakdown } from "./ExpensesBreakdown";
import { format, startOfWeek, endOfWeek, getWeek, isWithinInterval } from "date-fns";

interface TabbedExpensesChartProps {
    expenses: Array<{
        date: string;
        amount: number;
    }>;
    currency: string;
    width?: number;
    height?: number;
}

export function TabbedExpensesChart({
                                        expenses,
                                        currency,
                                        width = 300,
                                        height = 250
                                    }: TabbedExpensesChartProps) {
    const [activeTab, setActiveTab] = useState("monthly");

    const {
        annualData,
        monthlyData,
        weeklyData,
        dailyData
    } = useMemo(() => {
        // Annual data
        const byYear = expenses.reduce((acc, expense) => {
            const year = format(new Date(expense.date), 'yyyy');
            if (!acc[year]) acc[year] = 0;
            acc[year] += expense.amount;
            return acc;
        }, {});

        const annualData = Object.entries(byYear).map(([year, amount]) => ({
            label: year,
            year,
            amount: Number(amount)
        }))
            .sort((a, b) => a.year.localeCompare(b.year));

        // Monthly data
        const byMonth = expenses.reduce((acc, expense) => {
            const year = format(new Date(expense.date), 'yyyy');
            const month = format(new Date(expense.date), 'MMM');
            const key = `${year}-${month}`;
            if (!acc[key]) acc[key] = { year, month, amount: 0 };
            acc[key].amount += expense.amount;
            return acc;
        }, {});

        const monthlyData = Object.values(byMonth).map(({ year, month, amount }) => ({
            label: `${month}`,
            year,
            month,
            amount: Number(amount)
        }))
            .sort((a, b) => {
                if (a.year !== b.year) return a.year.localeCompare(b.year);
                return new Date(`${a.month} 1, 2000`).getTime() - new Date(`${b.month} 1, 2000`).getTime();
            });

        // Weekly data
        const byWeek = expenses.reduce((acc, expense) => {
            const date = new Date(expense.date);
            const year = format(date, 'yyyy');
            const weekNum = getWeek(date);
            const weekStart = format(startOfWeek(date), 'd/M/yy');
            const weekEnd = format(endOfWeek(date), 'd/M/yy');
            const key = `${year}-W${weekNum}`;

            if (!acc[key]) {
                acc[key] = {
                    year,
                    week: `W${weekNum}`,
                    label: `${weekStart} - ${weekEnd}`,
                    amount: 0
                };
            }
            acc[key].amount += expense.amount;
            return acc;
        }, {});

        const weeklyData = Object.values(byWeek).map(entry => ({
            ...entry,
            amount: Number(entry.amount)
        })).sort((a, b) => {
            if (a.year !== b.year) return a.year.localeCompare(b.year);
            return a.week.localeCompare(b.week);
        });

        // Daily data
        const byDay = expenses.reduce((acc, expense) => {
            const date = new Date(expense.date);
            const year = format(date, 'yyyy');
            const month = format(date, 'MMM');
            const day = format(date, 'd');
            const formattedDate = format(date, 'd/M');
            const key = format(date, 'yyyy-MM-dd');

            if (!acc[key]) {
                acc[key] = {
                    year,
                    month,
                    day,
                    label: formattedDate,
                    amount: 0
                };
            }
            acc[key].amount += expense.amount;
            return acc;
        }, {});

        const dailyData = Object.values(byDay).map(entry => ({
            ...entry,
            amount: Number(entry.amount)
        })).sort((a, b) => {
            const dateA = new Date(`${a.month} ${a.day}, ${a.year}`);
            const dateB = new Date(`${b.month} ${b.day}, ${b.year}`);
            return dateA.getTime() - dateB.getTime();
        });

        if (dailyData.length < 8) {
            setActiveTab("daily");
        } else if (weeklyData.length < 5) {
            setActiveTab("weekly");
        } else if (monthlyData.length < 13) {
            setActiveTab("monthly");
        } else {
            setActiveTab("annual");
        }

        return {
            annualData,
            monthlyData,
            weeklyData,
            dailyData
        };
    }, [expenses]);

    return (
        <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold mb-4">Expenses Breakdown</h3>
                    <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="annual">Annual</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="daily">Daily</TabsTrigger>
                    </TabsList>
                </div>

                <CardContent className="p-4">
                    <TabsContent value="annual" className="mt-0">
                        <TimeBasedExpensesChart
                            data={annualData}
                            currency={currency}
                            width={width}
                            height={height}
                            timeUnit="Annual"
                        />
                        <ExpensesBreakdown
                            data={annualData}
                            currency={currency}
                            timeUnit="Annual"
                        />
                    </TabsContent>

                    <TabsContent value="monthly" className="mt-0">
                        <TimeBasedExpensesChart
                            data={monthlyData}
                            currency={currency}
                            width={width}
                            height={height}
                            timeUnit="Monthly"
                        />
                        <ExpensesBreakdown
                            data={monthlyData}
                            currency={currency}
                            timeUnit="Monthly"
                        />
                    </TabsContent>

                    <TabsContent value="weekly" className="mt-0">
                        <TimeBasedExpensesChart
                            data={weeklyData.slice(-8)}
                            currency={currency}
                            width={width}
                            height={height}
                            timeUnit={(weeklyData.length > 8 ? "( Last 8 weeks ) " : "") + "Weekly"}
                        />
                        <ExpensesBreakdown
                            data={weeklyData}
                            currency={currency}
                            timeUnit="Weekly"
                        />
                    </TabsContent>

                    <TabsContent value="daily" className="mt-0">
                        <TimeBasedExpensesChart
                            data={dailyData.slice(-30)}
                            currency={currency}
                            width={width}
                            height={height}
                            timeUnit={(dailyData.length > 30 ? "( Last 30 days ) " : "") + "Daily"}
                        />
                        <ExpensesBreakdown
                            data={dailyData}
                            currency={currency}
                            timeUnit="Daily"
                        />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
