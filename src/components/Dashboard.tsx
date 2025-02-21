import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { CountrySelect } from "./CountrySelect";
import { useTrip } from "@/contexts/TripContext";
import { format } from "date-fns";
import {generalStats, getCategories, getCurrencySymbol, getExpenseDays, splitExpenses} from "@/utils/helpers";
import {D3BarChart} from "@/components/stats/D3BarChart.tsx";
import {D3PieChart} from "@/components/stats/D3PieChart.tsx";
import { YearlyExpensesBreakdown } from "@/components/stats/YearlyExpensesBreakdown";
import MapView from "@/components/maps/MapView";
import { CountryExpensesChart } from "@/components/stats/CountryExpensesChart";
import * as icons from "lucide-react";
import { countries } from "@/data/countries.ts";

export function Dashboard() {
  const { currentTripData } = useTrip();
  const [filters, setFilters] = useState({
    name: "",
    category: "",
    location: "",
    country: "",
    startDate: "",
    endDate: "",
  });
  const [hasFilters, setHasFilters] = useState(false);
  const [expenseNames, setExpenseNames] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any>(currentTripData?.expenses || []);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);
  const IconComponent = ({ iconName, color }: { iconName: string, color: string }) => {
    const Icon = (icons as any)[iconName];
    return Icon ? <Icon className="!h-5 !w-5" style={{color: color}} /> : null;
  };

  useEffect(() => {
    if (currentTripData?.expenses) {
      // Extract unique expense names and locations
      const names = [...new Set(currentTripData.expenses.map(e => e.name))];
      const locs = [...new Set(currentTripData.expenses.map(e => e.location).filter(Boolean))];
      setExpenseNames(names);
      setLocations(locs);
      setHasFilters(!!Object.values(filters).filter(item => item.length > 0).length)

      // Apply filters
      let filtered = [...splitExpenses(currentTripData.expenses)];

      if (filters.name) {
        filtered = filtered.filter(e =>
          e.name.toLowerCase().includes(filters.name.toLowerCase())
        );
      }

      if (filters.category) {
        filtered = filtered.filter(e => e.categoryId === filters.category);
      }

      if (filters.country) {
        filtered = filtered.filter(e => e.country?.toLowerCase() === filters.country.toLowerCase());
      }

      if (filters.location) {
        filtered = filtered.filter(e =>
          e.location?.toLowerCase().includes(filters.location.toLowerCase())
        );
      }

      if (filters.startDate) {
        filtered = filtered.filter(e => {
          const expenseDate = new Date(e.date);
          const startDate = new Date(filters.startDate);
          return expenseDate >= startDate;
        });
      }

      if (filters.endDate) {
        filtered = filtered.filter(e => {
          const expenseDate = new Date(e.date);
          const endDate = new Date(filters.endDate);
          return expenseDate <= endDate;
        });
      }

      setFilteredExpenses(filtered);
    }
  }, [currentTripData?.expenses, filters]);

  if (currentTripData?.expenses.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <p>No expenses yet</p>
          <p className="text-sm">Add your first expense using the + button below</p>
        </div>
    );
  }
  const clearFilters = () => {
    setFilters({
      name: "",
      category: "",
      location: "",
      country: "",
      startDate: "",
      endDate: "",
    });
    setHasFilters(false);
    toast.success("Filters cleared");
  };
  const filteredNames = expenseNames.filter((name) =>
      name.toLowerCase().includes(filters.name.toLowerCase())
  );
  const filteredLocations = locations.filter((loc) =>
      loc.toLowerCase().includes(filters.location.toLowerCase())
  );
  const stats = generalStats(currentTripData, filters);

  // Calculate statistics
  const totalSpent = stats.total.toFixed(2);
  const dailyAverage = stats.dailyAvg.toFixed(2);
  const dailyBudget = stats.dailyBudget.toFixed(2);
  const totalBudget = stats.totalBudget.toFixed(2);
  const dailyProgress = +stats.dailyPercentage.toFixed(0);
  const totalProgress = +stats.totalPercentage.toFixed(0);
  const avgCountPerDay = stats.avgCountPerDay.toFixed(2);
  const totalDays = stats.totalTripDays;
  const totalExpenses = stats.totalExpenses;
  const expensesProgress = +totalExpenses / +totalBudget * 100;
  const daysTilNow = stats.days;
  const daysProgress = +daysTilNow / +totalDays * 100;

  const monthIndexMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const categories = getCategories();
  const otherCategoryColor = "#6B7280";
  let totalAmount = 0;

  const reducedExpenses = filteredExpenses.reduce((acc, exp) => {
    if (!acc[exp.categoryId]) {
      acc[exp.categoryId] = {
        name: categories[exp.categoryId]?.name || "Unknown",
        amount: 0,
        color: categories[exp.categoryId]?.color || "#ffffff",
        icon: categories[exp.categoryId]?.icon || "",
      };
    }
    acc[exp.categoryId].amount += Number(exp.amount);
    totalAmount += Number(exp.amount);
    return acc;
  }, {} as Record<string, { name: string; amount: number; color: string, icon: string }>);

  const sortedEntries = Object.entries(reducedExpenses)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .sort(([,a], [,b]) => b.amount - a.amount);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const topCategories = sortedEntries.slice(0, 4).map(([key, value]) => ({ id: key, ...value }));
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const otherCategories = sortedEntries.slice(4).map(([key, value]) => ({ id: key, ...value }));

  const otherCategoriesList = {
    name: "Other",
    id: "other",
    amount: otherCategories.reduce((sum, item) => sum + item.amount, 0),
    color: otherCategoryColor,
    subItems: otherCategories,
  };

  const categorizedExpenses = [...topCategories, otherCategoriesList];

  const monthlyData = filteredExpenses.reduce((acc, expense) => {
    const month = format(new Date(expense.date), 'MMM');
    const year = format(new Date(expense.date), 'yyyy');
    const existingMonth = acc.find(item => item.month === month);

    if (existingMonth) {
      existingMonth.amount += expense.amount;
    } else {
      acc.push({ year, month, amount: expense.amount });
    }

    return acc;
  }, []).sort((a, b) => {
    const dateA = new Date(parseInt(a.year), monthIndexMap[a.month], 1);
    const dateB = new Date(parseInt(b.year), monthIndexMap[b.month], 1);
    return dateA.getTime() - dateB.getTime(); // ascending from oldest to newest
  });

  const groupedByYear = monthlyData.reduce((acc, item) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push({ year: item.year, month: item.month, amount: item.amount.toFixed(2) });
    return acc;
  }, {});

  const groupedByCountry = Object.values(
      filteredExpenses.reduce((acc, expense) => {
        if (!expense.country || expense.excludeFromAvg) return acc;

        const countryCode = expense.country.toLowerCase();

        if (!acc[countryCode]) {
          acc[countryCode] = {
            country: countries.find((c) => c.code.toLowerCase() === countryCode)?.name || expense.country,
            code: countryCode,
            flag: `https://flagcdn.com/w40/${countryCode}.png`,
            totalSpent: 0,
            days: new Set(),
            totalBudget: 0,
          };
        }

        acc[countryCode].totalSpent += expense.amount;
        acc[countryCode].days.add(expense.date); // Using Set to track unique days

        return acc;
      }, {} as Record<string, { country: string; flag: string; totalSpent: number; days: Set<string>; totalBudget: number }>)
  ).map((entry: any) => ({
    ...entry,
    days: entry.days.size,
    totalBudget: entry.days.size * stats.dailyBudget,
  }));

  const defaultPosition: [number, number] = [51.505, -0.09];
  const defaultZoom = 10;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg -mx-4">
        {/* Filter by Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <select
              className="w-full p-2 border rounded-md"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {Object.values(categories).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
            ))}
          </select>
        </div>

        {/* Filter by Name */}
        <div className="relative space-y-2">
          <Label>Name</Label>
          <div className="relative">
            <Input
                value={filters.name}
                onChange={(e) => {
                  setFilters({...filters, name: e.target.value});
                  setShowNameSuggestions(e.target.value.length > 0); // Show suggestions only if there's input
                }}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)} // Delay closing to allow click
                placeholder="Filter by name"
                className="h-10 text-sm pr-10"
            />
            {filters.name && (
                <button
                    type="button"
                    onClick={() => setFilters({...filters, name: ""})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4"/>
                </button>
            )}
          </div>
          {showNameSuggestions && filteredNames.length > 0 && (
              <Card
                  className="absolute top-full left-0 w-full mt-1 p-2 z-10 bg-white shadow-md rounded-md max-h-96 overflow-y-auto">
                {filteredNames.map((name) => (
                    <div
                        key={name}
                        onMouseDown={() => {
                          setFilters({...filters, name});
                          setShowNameSuggestions(false);
                        }}
                        className="p-2 cursor-pointer hover:bg-gray-100 text-sm rounded-md"
                    >
                      {name}
                    </div>
                ))}
              </Card>
          )}
        </div>

        {/* Filter by Country */}
        <div className="space-y-2">
          <Label>Country</Label>
          <CountrySelect
              value={filters.country}
              isFilter={true}
              onChange={(value) => setFilters({...filters, country: value})}
          />
        </div>

        {/* Filter by Location */}
        <div className="relative space-y-2">
          <Label>Location</Label>
          <div className="relative">
            {/* Text Input */}
            <Input
                value={filters.location}
                onChange={(e) => {
                  setFilters({...filters, location: e.target.value});
                  setShowLocationSuggestions(e.target.value.length > 0); // Show suggestions only when typing
                }}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)} // Delay hiding to allow selection
                placeholder="Filter by location"
                className="h-10 text-sm pr-10" // Space for clear button
            />

            {filters.location && (
                <button
                    type="button"
                    onClick={() => setFilters({...filters, location: ""})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4"/>
                </button>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          {showLocationSuggestions && filteredLocations.length > 0 && (
              <Card
                  className="absolute top-full left-0 w-full mt-1 p-2 z-10 bg-white shadow-md rounded-md max-h-96 overflow-y-auto">
                {filteredLocations.map((loc) => (
                    <div
                        key={loc}
                        onMouseDown={() => {
                          setFilters({...filters, location: loc});
                          setShowLocationSuggestions(false);
                        }}
                        className="p-2 cursor-pointer hover:bg-gray-100 text-sm rounded-md"
                    >
                      {loc}
                    </div>
                ))}
              </Card>
          )}
        </div>

        {/* Filter by Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />
        </div>

        {/* Filter by End Date */}
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />
        </div>
      </div>

      {hasFilters && (
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4"/>
              Clear Filters
            </Button>
          </div>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <h3 className="text-lg font-semibold mb-2">Total Spent</h3>
          <p className="text-2xl font-bold text-secondary">
            {totalSpent} {getCurrencySymbol(currentTripData?.currency)}
          </p>
          {!hasFilters && (
              <div className="mt-4">
                <div className="flex justify-end mb-2">
                  <span className="text-lg font-medium">
                    {totalBudget} {getCurrencySymbol(currentTripData?.currency)}
                  </span>
                </div>
                <Progress value={totalProgress} className="h-2"/>
                <span className="text-sm text-muted-foreground">Total Spent vs Total Budget</span>
              </div>
          )}
        </Card>

        <Card className="p-3">
          <h3 className="text-lg font-semibold mb-2">Daily Average</h3>
          <p className="text-2xl font-bold text-secondary">
            {dailyAverage} {getCurrencySymbol(currentTripData?.currency)}
          </p>
          {!hasFilters && (
              <div className="mt-4">
                <div className="flex justify-end mb-2">
                  <span className="text-lg font-medium">
                    {dailyBudget} {getCurrencySymbol(currentTripData?.currency)}
                  </span>
                </div>
                <Progress value={dailyProgress} className="h-2"/>
                <span className="text-sm text-muted-foreground">Daily Average vs Daily Budget</span>
              </div>
          )}
        </Card>

        <Card className="p-3">
          <h3 className="text-lg font-semibold mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-secondary">
            {totalExpenses}
          </p>
          <div className="mt-4">
            <div className="flex justify-end mb-2">
              <span className="text-lg font-medium">
                {avgCountPerDay}
              </span>
            </div>
            <Progress value={expensesProgress} className="h-2"/>
            <span className="text-sm text-muted-foreground">Average expenses per day</span>
          </div>
        </Card>

        <Card className="p-3">
          <h3 className="text-lg font-semibold mb-2">Total Days</h3>
          <p className="text-3xl font-bold text-secondary">
            {totalDays}
          </p>
          <div className="mt-4">
            <div className="flex justify-end mb-2">
              <span className="text-lg font-medium">
                  {daysTilNow}
                </span>
            </div>
            <Progress value={daysProgress} className="h-2"/>
            <span className="text-sm text-muted-foreground">Trip duration so far</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-1">
            <h3 className="text-lg font-semibold mb-4 mx-3">Monthly Expenses</h3>
            <D3BarChart data={monthlyData} width={300} height={250}/>
            <YearlyExpensesBreakdown
                groupedByYear={groupedByYear}
                currency={currentTripData?.currency ?? "EUR"}
            />
          </Card>

          <div className="space-y-6">
            <Card className="p-3">
              <h3 className="text-lg font-semibold mb-4 mx-3">Expenses by Category</h3>
              <D3PieChart data={categorizedExpenses} width={300} height={250}
                          currency={getCurrencySymbol(currentTripData?.currency)}/>

              <div className="mt-4 w-full">
                <ul className="space-y-2">
                  {categorizedExpenses
                      .filter((cat) => cat.id !== "other")
                      .map((item) => {
                        const percentage = ((item.amount / totalAmount) * 100).toFixed(1);
                        return (
                            <li
                                key={item.name}
                                className={`flex justify-between items-center px-2 py-2 rounded-md shadow-sm text-black bg-gray-100 shadow-md ring-2 ring-gray-200`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="rounded-full p-2"
                                     style={{backgroundColor: item.color}}
                                >
                                  <IconComponent iconName={item.icon} color="#ffffff"/>
                                </div>
                                <span className="text-md font-medium">
                                  {item.name}
                                  <span className="text-xs"> ({percentage}%)</span>
                                </span>
                              </div>
                              <span className="text-md font-semibold">
                                {item.amount.toFixed(2)}{getCurrencySymbol(currentTripData?.currency)}
                              </span>
                            </li>
                        );
                      })}

                  {otherCategoriesList && otherCategoriesList.amount > 0 && (
                      <li className={`px-2 py-2 rounded-md shadow-sm text-black bg-gray-100 shadow-md ring-2 ring-gray-200`}>
                        <button
                            onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                            className="w-full flex justify-between items-center"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="rounded-full p-2"
                                 style={{backgroundColor: otherCategoriesList.color}}
                            >
                              <IconComponent iconName="Ellipsis" color="#ffffff"/>
                            </div>
                            <span className="text-sm font-medium">{otherCategoriesList.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-semibold">
                            <span>{otherCategoriesList.amount.toFixed(2)}{getCurrencySymbol(currentTripData?.currency)}</span>
                            {isOtherExpanded ? (
                                <ChevronDown className="h-4 w-4"/>
                            ) : (
                                <ChevronRight className="h-4 w-4"/>
                            )}
                          </div>
                        </button>

                        {isOtherExpanded && (
                            <ul className="mt-4 space-y-1">
                              {otherCategoriesList.subItems.map((sub) => (
                                  <li
                                      key={sub.name}
                                      className="flex justify-between items-center bg-white p-2 rounded-md text-black ring-1 ring-gray-300"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <IconComponent iconName={sub.icon} color={sub.color}/>
                                      <span className="text-md font-medium">{sub.name}
                                        <span
                                            className="text-xs"> ({((sub.amount / totalAmount) * 100).toFixed(1)}%)</span>
                                      </span>
                                    </div>
                                    <span className="text-md font-semibold">
                                      {sub.amount.toFixed(2)} {getCurrencySymbol(currentTripData?.currency)}
                                    </span>
                                  </li>
                              ))}
                            </ul>
                        )}
                      </li>
                  )}
                </ul>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-3">
              <h3 className="text-lg font-semibold mb-4 mx-3">Expenses by Country</h3>
              <CountryExpensesChart data={groupedByCountry} currency={currentTripData?.currency || "EUR"} />
            </Card>
          </div>

          <Card className="p-3">
            <h3 className="text-lg font-semibold mb-4 mx-3">Expenses Map</h3>
            <MapView position={defaultPosition} zoom={defaultZoom} expenses={filteredExpenses}/>
          </Card>
        </div>
      </div>
    </div>
  );
}
