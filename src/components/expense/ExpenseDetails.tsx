import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "../CountrySelect";
import { DateRange } from "react-day-picker";
import { ExpenseFormData } from "@/types/expense";
import { ExpenseNameInput } from "./ExpenseNameInput";
import { ExpenseDateRangePicker } from "./ExpenseDateRangePicker";
import { ExpenseAmountInput } from "./ExpenseAmountInput";
import { Search } from "lucide-react";
import {getCoordinates, getUserLocation} from "@/utils/helpers";
import { Checkbox } from "@/components/ui/checkbox";
import { countries } from "@/data/countries";
import { toast } from "sonner";
import {useEffect, useState} from "react";
import {LocationData} from "@/types/location.ts";

interface ExpenseDetailsProps {
    formData: ExpenseFormData;
    onFormDataChange: (data: Partial<ExpenseFormData>) => void;
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
    onBack: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isEdit: boolean;
}

export function ExpenseDetails({
                                   formData,
                                   onFormDataChange,
                                   date,
                                   onDateChange,
                                   onBack,
                                   onSubmit,
                                   isEdit,
                               }: ExpenseDetailsProps) {

    const [data, setData] = useState(formData);

    useEffect(() => {
        const gpsEnabled = localStorage.getItem("gpsEnabled");
        const updateLocation = localStorage.getItem("updateLocation");

        if (gpsEnabled && JSON.parse(gpsEnabled) && updateLocation && JSON.parse(updateLocation)) {
            getUserLocation()
                .then((locationData: LocationData) => {
                    const updatedData = {
                        ...data,
                        country: locationData.country,
                        location: locationData.city,
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                    };
                    setData(updatedData);

                    onFormDataChange({
                        country: locationData.country,
                        location: locationData.city,
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                    });

                    const saveSelectedLocation = localStorage.getItem("saveSelectedLocation");
                    if (saveSelectedLocation && JSON.parse(saveSelectedLocation)) {
                        localStorage.setItem("userLocation", JSON.stringify(locationData));
                    }
                })
                .catch((error) => {
                    toast.error("Location access denied");
                });
        }
    }, []); // Empty dependency array to run only once

    const getCoords = () => {
        toast.info("Trying to get coordinates");
        const country: any = countries.find(item => item.code.toLowerCase() === formData.country.toLowerCase());
        getCoordinates(formData.location, country.name).then(res => {
            if(res) {
                const locationData = {
                    latitude: res.latitude,
                    longitude: res.longitude,
                    country: formData.country,
                    city: formData.location,
                    updated_at: new Date(),
                }
                const saveSelectedLocation = localStorage.getItem('saveSelectedLocation');
                if (JSON.parse(saveSelectedLocation)) {
                    localStorage.setItem('userLocation', JSON.stringify(locationData));
                }
                formData.latitude = res.latitude;
                formData.longitude = res.longitude;
                setData(formData);
                toast.success("Coordinates for " + formData.location + ", " + country.name + " found");
            } else {
                toast.error("Coordinates for " + formData.location + ", " + country.name + " not found, check location name");
            }
        });
    }

    const onLocationChange = (target: string) => {
        onFormDataChange({ location: target });
    };
    return (
        <form onSubmit={onSubmit} className="space-y-6 expense-item-form">
            <div className="space-y-4">
                <ExpenseAmountInput
                    onBack={onBack}
                    amount={formData.amount}
                    categoryID={formData.categoryId}
                    onAmountChange={(amount) => onFormDataChange({ amount })}
                    isEdit={isEdit}
                />
                <ExpenseNameInput
                    categoryID={formData.categoryId}
                    value={formData.name || ""}
                    onChange={(name) => onFormDataChange({ name })}
                />
                <ExpenseDateRangePicker date={date} onDateChange={onDateChange} />

                {/* Description with smaller height */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => onFormDataChange({ description: e.target.value })}
                        className="h-8"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Country</Label>
                    <CountrySelect
                        value={data.country}
                        onChange={(value) => onFormDataChange({ country: value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            id="location"
                            value={data.location}
                            onChange={(e) => onLocationChange(e.target.value)}
                            placeholder="Enter city or place"
                        />
                        <Search className="!h-5 !w-5" onClick={getCoords} />
                    </div>
                </div>

                {/* NEW: Exclude from Average Toggle */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="excludeFromAvg"
                            checked={formData.excludeFromAvg}
                            onCheckedChange={(checked) => onFormDataChange({ excludeFromAvg: !!checked })}
                        />
                        <Label htmlFor="excludeFromAvg">Exclude from average</Label>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    className="w-full"
                >
                    Back to Categories
                </Button>
                <Button type="submit" className="w-full">
                    {isEdit ? "Update" : "Add Expense"}
                </Button>
            </div>
        </form>
    );
}
