import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ExpenseNameInputProps {
    value: string;
    onChange: (name: string) => void;
    categoryID: string;
}

export function ExpenseNameInput({ value, onChange, categoryID }: ExpenseNameInputProps) {
    const [inputValue, setInputValue] = useState(value);
    const [namesArray, setNamesArray] = useState<string[]>([]);
    const [filteredNamesArray, setFilteredNamesArray] = useState<string[]>([]);

    useEffect(() => {
        const selectedTripId = localStorage.getItem("selectedTripId");
        const trips = JSON.parse(localStorage.getItem("trips") || "[]");

        if (selectedTripId && trips.length) {
            const currentTrip = trips.find((trip: any) => trip.id === selectedTripId);
            if (currentTrip) {
                const uniqueNames: string[] = Array.from(
                    new Set(
                        currentTrip.expenses
                            .filter((expense: any) => expense.categoryId === categoryID && expense.name.trim() !== "")
                            .map((expense: any) => expense.name)
                    )
                );
                setNamesArray(uniqueNames);
                setFilteredNamesArray(uniqueNames);
            }
        }
    }, [categoryID]);

    return (
        <div className="space-y-2 !mt-0">
            <Label htmlFor="name">Name *</Label>
            <Input
                id="name"
                required
                value={inputValue}
                onChange={(e) => {
                    if (!e.target.value) {
                        console.log(namesArray)
                        setFilteredNamesArray(namesArray);
                    } else {
                        const filteredNames = namesArray.filter((name) =>
                            name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredNamesArray(filteredNames);
                    }
                    setInputValue(e.target.value);
                    onChange(e.target.value);
                }}
                placeholder="Enter expense name"
            />

            <div className="max-w-[calc(100vw-50px)] overflow-x-scroll pb-[7px]">
                <div className="flex flex-row flex-nowrap gap-2">
                    {filteredNamesArray.map((name) => (
                        <Badge
                            key={name}
                            className="cursor-pointer px-2 py-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-300 transition whitespace-nowrap"
                            onClick={() => {
                                setInputValue(name);
                                onChange(name);
                            }}
                        >
                            {name}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
}
