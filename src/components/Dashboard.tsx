import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { CountrySelect } from "./CountrySelect";
import { useTrip } from "@/contexts/TripContext";
import { format } from "date-fns";
import {generalStats, getCategories, getCurrencySymbol, splitExpenses, formatWithCommas} from "@/utils/helpers";
import {D3BarChart} from "@/components/stats/D3BarChart.tsx";
import {D3PieChart} from "@/components/stats/D3PieChart.tsx";
import { YearlyExpensesBreakdown } from "@/components/stats/YearlyExpensesBreakdown";
import MapView from "@/components/maps/MapView";
import { CountryExpensesChart } from "@/components/stats/CountryExpensesChart";
import * as icons from "lucide-react";
import { countries } from "@/data/countries.ts";
import { TabbedExpensesChart } from "@/components/stats/TabbedExpensesChart";

// Memoized components
const MemoizedD3BarChart = memo(D3BarChart);
const MemoizedD3PieChart = memo(D3PieChart);
const MemoizedYearlyExpensesBreakdown = memo(YearlyExpensesBreakdown);
const MemoizedMapView = memo(MapView);
const MemoizedCountryExpensesChart = memo(CountryExpensesChart);

interface IconProps {
  iconName: string;
  color: string
}

interface CardProps {
  title: string;
  value: number | string;
  maxValue: number | string;
  progress: number;
  subtitle: string;
  symbol: string;
}

interface CategoryItemProps {
  amount: number;
  name: string;
  color: string;
  icon: string;
}

interface CategoryItemsProps {
  item: CategoryItemProps;
  totalAmount: number;
  currencySymbol: string;
}

interface ExpenseFiltersProps {
  filters: any;
  setFilters: any;
  categories: any;
  expenseNames: any;
  locations: any;
  onClearFilters: any;
  hasFilters: any;
}

interface OtherCategoriesProps {
  otherCategoriesList:any;
  isExpanded:any;
  onToggle:any;
  totalAmount:any;
  currencySymbol:any;
}

// Helper component extracted and memoized
const IconComponent = memo<IconProps>(({ iconName, color }) => {
  const Icon = (icons)[iconName];
  return Icon ? <Icon className="!h-5 !w-5" style={{color: color}} /> : null;
});

// Stats card component
const StatsCard = memo<CardProps>(({ title, value, maxValue, progress, subtitle, symbol }) => (
    <Card className="p-3">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-2xl font-bold text-secondary">
        {formatWithCommas(value.toString(), false)} {symbol}
      </p>
      {maxValue && (
          <div className="mt-4">
            <div className="flex justify-end mb-2">
          <span className="text-lg font-medium">
            {maxValue} {symbol}
          </span>
            </div>
            <Progress value={progress} className="h-2"/>
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          </div>
      )}
    </Card>
));

// Category list item component
const CategoryItem = memo<CategoryItemsProps>(({ item, totalAmount, currencySymbol }) => {
  const percentage = ((item.amount / totalAmount) * 100).toFixed(1);
  return (
      <li
          className="flex justify-between items-center px-2 py-2 rounded-md shadow-sm text-black bg-gray-100 shadow-md ring-2 ring-gray-200"
      >
        <div className="flex items-center space-x-2">
          <div className="rounded-full p-2" style={{backgroundColor: item.color}}>
            <IconComponent iconName={item.icon} color="#ffffff"/>
          </div>
          <span className="text-md font-medium">
          {item.name}
            <span className="text-xs"> ({percentage}%)</span>
        </span>
        </div>
        <span className="text-md font-semibold">
        {formatWithCommas(item.amount.toString(), false)} {currencySymbol}
      </span>
      </li>
  );
});

// Filters component
const ExpenseFilters = memo<ExpenseFiltersProps>(({ filters, setFilters, categories, expenseNames, locations, onClearFilters, hasFilters }) => {
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const filteredNames = useMemo(() =>
          expenseNames.filter((name) => name.toLowerCase().includes(filters.name.toLowerCase())),
      [expenseNames, filters.name]
  );

  const filteredLocations = useMemo(() =>
          locations.filter((loc) => loc.toLowerCase().includes(filters.location.toLowerCase())),
      [locations, filters.location]
  );

  return (
      <>
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
              {Object.values(categories).map((category: any) => (
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
                    setShowNameSuggestions(e.target.value.length > 0);
                  }}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
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
                <Card className="absolute top-full left-0 w-full mt-1 p-2 z-10 bg-white shadow-md rounded-md max-h-96 overflow-y-auto">
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
              <Input
                  value={filters.location}
                  onChange={(e) => {
                    setFilters({...filters, location: e.target.value});
                    setShowLocationSuggestions(e.target.value.length > 0);
                  }}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder="Filter by location"
                  className="h-10 text-sm pr-10"
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
            {showLocationSuggestions && filteredLocations.length > 0 && (
                <Card className="absolute top-full left-0 w-full mt-1 p-2 z-10 bg-white shadow-md rounded-md max-h-96 overflow-y-auto">
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
              <Button variant="outline" onClick={onClearFilters} className="gap-2">
                <X className="h-4 w-4"/>
                Clear Filters
              </Button>
            </div>
        )}
      </>
  );
});

// Other categories component
const OtherCategories = memo<OtherCategoriesProps>(({ otherCategoriesList, isExpanded, onToggle, totalAmount, currencySymbol }) => {
  if (!otherCategoriesList || otherCategoriesList.amount <= 0) return null;

  return (
      <li className="px-2 py-2 rounded-md shadow-sm text-black bg-gray-100 shadow-md ring-2 ring-gray-200">
        <button
            onClick={onToggle}
            className="w-full flex justify-between items-center"
        >
          <div className="flex items-center space-x-2">
            <div className="rounded-full p-2" style={{backgroundColor: otherCategoriesList.color}}>
              <IconComponent iconName="Ellipsis" color="#ffffff" />
            </div>
            <span className="text-sm font-medium">{otherCategoriesList.name}</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <span>{formatWithCommas(otherCategoriesList.amount.toString(), false)} {currencySymbol}</span>
            {isExpanded ? (
                <ChevronDown className="h-4 w-4"/>
            ) : (
                <ChevronRight className="h-4 w-4"/>
            )}
          </div>
        </button>

        {isExpanded && (
            <ul className="mt-4 space-y-1">
              {otherCategoriesList.subItems.map((sub) => (
                  <li
                      key={sub.name}
                      className="flex justify-between items-center bg-white p-2 rounded-md text-black ring-1 ring-gray-300"
                  >
                    <div className="flex items-center space-x-1">
                      <IconComponent iconName={sub.icon} color={sub.color}/>
                      <span className="text-md font-medium">{sub.name}
                        <span className="text-xs"> ({((sub.amount / totalAmount) * 100).toFixed(1)}%)</span>
                </span>
                    </div>
                    <span className="text-md font-semibold">
                {formatWithCommas(sub.amount.toString(), false)} {currencySymbol}
              </span>
                  </li>
              ))}
            </ul>
        )}
      </li>
  );
});

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
  const [expenseNames, setExpenseNames] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);

  const currencySymbol = useMemo(() =>
          getCurrencySymbol(currentTripData?.currency),
      [currentTripData?.currency]
  );

  const categories = useMemo(() => getCategories(), []);

  const monthIndexMap = useMemo(() => ({
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }), []);

  const clearFilters = useCallback(() => {
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
  }, []);

  // Apply filters effect
  useEffect(() => {
    if (!currentTripData?.expenses) return;

    // Extract unique expense names and locations
    const names = [...new Set(currentTripData.expenses.map(e => e.name))];
    const locs = [...new Set(currentTripData.expenses.map(e => e.location).filter(Boolean))];

    setExpenseNames(names);
    setLocations(locs);
    setHasFilters(!!Object.values(filters).filter(item => item.length > 0).length);

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
  }, [currentTripData?.expenses, filters]);

  // Empty state
  if (!currentTripData?.expenses || currentTripData.expenses.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <p>No expenses yet</p>
          <p className="text-sm">You need to add at least one expense to show statistics</p>
        </div>
    );
  }

  // Memoize expensive calculations
  const stats = useMemo(() =>
          generalStats(currentTripData, filters),
      [currentTripData, filters]
  );

  const {
    totalSpent, dailyAverage, dailyBudget, totalBudget,
    dailyPercentage, totalPercentage, avgCountPerDay,
    totalTripDays, totalExpenses, days
  } = useMemo(() => {
    return {
      totalSpent: stats.total.toFixed(2),
      dailyAverage: stats.dailyAvg.toFixed(2),
      dailyBudget: stats.dailyBudget.toFixed(2),
      totalBudget: stats.totalBudget.toFixed(2),
      dailyPercentage: +stats.dailyPercentage.toFixed(0),
      totalPercentage: +stats.totalPercentage.toFixed(0),
      avgCountPerDay: stats.avgCountPerDay.toFixed(2),
      totalTripDays: stats.totalTripDays,
      totalExpenses: stats.totalExpenses,
      days: stats.days
    };
  }, [stats]);

  const expensesProgress = useMemo(() =>
          +totalExpenses / +totalBudget * 100,
      [totalExpenses, totalBudget]
  );

  const daysProgress = useMemo(() =>
          +days / +totalTripDays * 100,
      [days, totalTripDays]
  );

  // Process categories data
  const { categorizedExpenses, totalAmount, otherCategoriesList } = useMemo(() => {
    let totalAmt = 0;

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
      totalAmt += Number(exp.amount);
      return acc;
    }, {});

    const sortedEntries = Object.entries(reducedExpenses)
        .sort(([,a], [,b]) => b.amount - a.amount);

    const topCategories = sortedEntries.slice(0, 4).map(([key, value]) => ({ id: key, ...value }));
    const otherCategories = sortedEntries.slice(4).map(([key, value]) => ({ id: key, ...value }));

    const otherCategoriesList = {
      name: "Other",
      id: "other",
      amount: otherCategories.reduce((sum, item) => sum + item.amount, 0),
      color: "#6B7280",
      subItems: otherCategories,
    };

    return {
      categorizedExpenses: [...topCategories, otherCategoriesList],
      totalAmount: totalAmt,
      otherCategoriesList
    };
  }, [filteredExpenses, categories]);

  // Process country data
  const groupedByCountry = useMemo(() => {
    return Object.values(
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
          acc[countryCode].days.add(expense.date);

          return acc;
        }, {})
    ).map((entry: any) => ({
      ...entry,
      days: entry.days.size,
      totalBudget: entry.days.size * stats.dailyBudget,
    }));
  }, [filteredExpenses, stats.dailyBudget]);

  return (
      <div className="space-y-6">
        <ExpenseFilters
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            expenseNames={expenseNames}
            locations={locations}
            onClearFilters={clearFilters}
            hasFilters={hasFilters}
        />

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
              title="Total Spent"
              value={totalSpent}
              maxValue={!hasFilters ? totalBudget : null}
              progress={totalPercentage}
              subtitle="Total Spent vs Total Budget"
              symbol={currencySymbol}
          />

          <StatsCard
              title="Daily Average"
              value={dailyAverage}
              maxValue={!hasFilters ? dailyBudget : null}
              progress={dailyPercentage}
              subtitle="Daily Average vs Daily Budget"
              symbol={currencySymbol}
          />

          <StatsCard
              title="Total Expenses"
              value={totalExpenses}
              maxValue={avgCountPerDay}
              progress={expensesProgress}
              subtitle="Average expenses per day"
              symbol=""
          />

          <StatsCard
              title="Total Days"
              value={totalTripDays}
              maxValue={days}
              progress={daysProgress}
              subtitle="Trip duration so far"
              symbol=""
          />
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-3">
              <TabbedExpensesChart
                  expenses={filteredExpenses}
                  currency={currentTripData?.currency ?? "EUR"}
                  width={300}
                  height={300}
              />
            </Card>

            <div className="space-y-6">
              <Card className="p-3">
                <h3 className="text-lg font-semibold mb-4 mx-3">Expenses by Category</h3>
                <MemoizedD3PieChart
                    data={categorizedExpenses}
                    width={300}
                    height={250}
                    currency={currencySymbol}
                />

                <div className="mt-4 w-full">
                  <ul className="space-y-2">
                    {categorizedExpenses
                        .filter((cat) => cat.id !== "other")
                        .map((item) => (
                            <CategoryItem
                                key={item.id}
                                item={item}
                                totalAmount={totalAmount}
                                currencySymbol={currencySymbol}
                            />
                        ))}

                    <OtherCategories
                        otherCategoriesList={otherCategoriesList}
                        isExpanded={isOtherExpanded}
                        onToggle={() => setIsOtherExpanded(!isOtherExpanded)}
                        totalAmount={totalAmount}
                        currencySymbol={currencySymbol}
                    />
                  </ul>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-3">
                <h3 className="text-lg font-semibold mb-4 mx-3">Expenses by Country</h3>
                <MemoizedCountryExpensesChart
                    data={groupedByCountry}
                    currency={currentTripData?.currency || "EUR"}
                />
              </Card>
            </div>

            <Card className="p-3">
              <h3 className="text-lg font-semibold mb-4 mx-3">Expenses Map</h3>
              <MemoizedMapView
                  position={[51.505, -0.09]}
                  zoom={10}
                  expenses={filteredExpenses}
              />
            </Card>
          </div>
        </div>
      </div>
  );
}
