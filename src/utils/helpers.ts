import { isBefore, parseISO, format, isToday, isYesterday, isTomorrow, differenceInDays } from 'date-fns';
import { defaultCategories } from "@/config/defaultCategories";
import { Categories } from "@/types/category.ts";
import { Expense } from "@/types/expense.ts";
import { LocationData } from "@/types/location.ts";

export function isFutureDate (dateString: string)  {
    const incomingDate = new Date(dateString);
    incomingDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return incomingDate > today;
}

export function getRelativeDateLabel (currentDate: string) {
    const date = new Date(currentDate);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, 'dd MMM');
}

export function getCategories (): Categories {
    const currentTripId = localStorage.getItem('selectedTripId');
    const currentTrip = JSON.parse(localStorage.getItem('trips') || '[]').find((trip: any) => trip.id === currentTripId);
    return currentTrip?.categories || defaultCategories;
}

export function currentCurrency () {
    const currentTripId = localStorage.getItem('selectedTripId');
    const currentTrip = JSON.parse(localStorage.getItem('trips') || '[]').find((trip: any) => trip.id === currentTripId);
    return currentTrip?.currency || 'EUR';
}

export function currentCurrencySymbol () {
    return getCurrencySymbol(currentCurrency());
}

export function splitExpenses (expenses: any) {
    const seperatedExpenses = [];
    expenses.forEach(expense => {
        if (expense.endDate && expense.endDate !== expense.date) {
            const days = differenceInDays(parseISO(expense.endDate), parseISO(expense.date)) + 1;
            for (let i = 0; i < days; i++) {
                const date = new Date(expense.date);

                date.setDate(date.getDate() + i);
                seperatedExpenses.push({ ...expense, date: format(date, "yyyy-MM-dd"), amount: expense.amount / days, endDate: null });
            }
        } else {
            seperatedExpenses.push(expense);
        }
    });
    return seperatedExpenses;
}

export function generalStats(trip: any, filters: any = {}) {
    const stats = {
        dailyAvg: 0,
        days: 0,
        avgCountPerDay: 0,
        total: 0,
        dailyBudget: trip.dailyBudget || 0,
        totalBudget: trip.totalBudget || 0,
        dailyPercentage: 0,
        totalPercentage: 0,
        totalExpenses: 0,
        totalTripDays: 0,
        totalDaysFromExpenses: 0
    };

    const splited = splitExpenses(trip.expenses);

    let filtered = [...splited];

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

    if (!trip || !filtered || filtered.length === 0) {
        return stats; // Return default if no expenses or no budget
    }

    const days: { [key: string]: number } = {};
    const daysForDailyAvg: { [key: string]: number } = {};
    let totalExpenses = 0;

    const dates = filtered.map(expense => new Date(expense.date));
    const firstExpenseDate = new Date(Math.min(...dates.map(date => date.getTime())));
    const lastExpenseDate = new Date(Math.max(...dates.map(date => date.getTime())));
    const today = new Date();
    const lastDayOfTrip = trip.dateRange?.to ? new Date(trip.dateRange?.to) : lastExpenseDate;

    let totalDailyAvg = 0;
    filtered.forEach((expense: any) => {
        days[expense.date] = (days[expense.date] || 0) + 1;
        stats.total += expense.amount;
        if (!expense.excludeFromAvg) {
            daysForDailyAvg[expense.date] = (daysForDailyAvg[expense.date] || 0) + 1;
            totalDailyAvg += expense.amount;
        }
        totalExpenses++;
    });
    stats.totalTripDays = Math.ceil(
        (lastDayOfTrip.getTime() - firstExpenseDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    stats.days = Math.ceil(
        (today.getTime() - firstExpenseDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    stats.totalDaysFromExpenses = Object.keys(days).length;
    stats.dailyAvg = totalDailyAvg / Object.keys(daysForDailyAvg).length;
    stats.dailyPercentage = (stats.dailyAvg / stats.dailyBudget) * 100;
    stats.totalPercentage = (stats.total / stats.totalBudget) * 100;
    stats.avgCountPerDay = totalExpenses / stats.days;
    stats.totalExpenses = filtered.length;

    return stats;
}

export function upTodayStats(trip: any) {
    const avg = {
        today: 0,
        dailyAvg: 0,
        days: 0,
        total: 0,
        percentage: 0,
        overflown: false
    };

    const dailyBudget = trip.dailyBudget || 0;

    if (!trip || !trip.expenses || trip.expenses.length === 0) {
        return avg; // Return default if no expenses or no budget
    }

    const today = new Date();
    const formattedDate = format(today, "yyyy-MM-dd");

    const splited = splitExpenses(trip.expenses);
    const days = {};

    splited.forEach((expense: any) => {
        const expenseDate = new Date(expense.date);
        if (isBefore(expenseDate, today) && !expense.excludeFromAvg) {
            days[expense.date] = days[expense.date] ? ++days[expense.date] : 1;
            avg.total += expense.amount;
            if (formattedDate === expense.date) {
                avg.today += expense.amount;
            }
        }
    });
    avg.days = Object.keys(days).length;
    avg.dailyAvg = avg.total / avg.days;
    avg.percentage = (avg.dailyAvg / dailyBudget) * 100;
    if (avg.percentage > 100) {
        avg.overflown = true;
    }

    return avg;
}

export function dailyAverageLabels(trip: any) {
    const avg = upTodayStats(trip);
    return {
        dailyAverage: `${avg.dailyAvg.toFixed(2)} ${getCurrencySymbol(trip.currency)}`,
        total: `${avg.total.toFixed(2)} ${getCurrencySymbol(trip.currency)}`,
        dailyBudget: trip.dailyBudget ? `${trip.dailyBudget.toFixed(2)} ${getCurrencySymbol(trip.currency)}` : '',
        totalBudget: trip.totalBudget ? `${trip.totalBudget.toFixed(2)} ${getCurrencySymbol(trip.currency)}` : '',
        percentage: `${Math.min(avg.percentage, 100).toFixed(2)}%`,
        color: `${avg.overflown ? 'bg-red-400' : 'bg-green-400'}`
    };
}

export function getCurrencySymbol(currency: string) {
    switch (currency) {
        case 'EUR':
            return '€';
        case 'USD':
            return '$';
        case 'GBP':
            return '£';
        case 'JPY':
            return '¥';
        default:
            return currency;
    }
}

export function getExpenseDays(expense: Expense & { toDate?: Date }): number {
    if (!expense.date) return 0;
    if (!expense.endDate) return 1;

    const startDate = new Date(expense.date);
    const endDate =  new Date(expense.endDate);

    return differenceInDays(endDate, startDate) + 1;
}

export function getUserLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );
                    const data = await response.json();
                    const locationData: LocationData = {
                        latitude,
                        longitude,
                        country: data.countryCode?.toLowerCase() || "",
                        city: data.city || "",
                        updated_at: new Date(),
                    };
                    resolve(locationData);
                } catch (error) {
                    reject(error);
                }
            },
            (error) => {
                reject(error);
            }
        );
    });
}

export async function getCoordinates(city: string, country: string) {
    const query = `${city}, ${country}`;
    return fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            }
            console.log('No results found', city, country);
            return null;
        })
        .catch(error => {
            console.error('Error fetching coordinates:', error);
        });
}

export const formatWithCommas = (value: string, hasDecimals: boolean = true) => {
    if (!value) return value;

    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');

    // Split by decimal point
    const parts = cleanValue.split('.');

    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Join back with decimal part if it exists
    return parts.length > 1 && hasDecimals ? parts.join('.') : parts[0];
};
