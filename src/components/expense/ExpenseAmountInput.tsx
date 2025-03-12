import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import { currentCurrency, getCategories, formatWithCommas } from "@/utils/helpers";
import { useRef, useEffect, useState } from "react";

interface ExpenseAmountInputProps {
    amount: number;
    onAmountChange: (amount: number) => void;
    categoryID: string;
    onBack: () => void;
    isEdit?: boolean
}

export function ExpenseAmountInput({
                                       amount,
                                       onAmountChange,
                                       categoryID,
                                       onBack,
                                       isEdit = false,
                                   }: ExpenseAmountInputProps) {
    const [fromCurrency, setFromCurrency] = useState("");
    const [currencyConversion, setCurrencyConversion] = useState(false);
    const [customCurrencyConversion, setCustomCurrencyConversion] = useState(false);
    const [customCurrencyConversionPrice, setCustomCurrencyConversionPrice] = useState(1);
    const [ratePrice, setRatePrice] = useState(1);
    const [convertedAmount, setConvertedAmount] = useState(0);
    const [labelCurrency, setLabelCurrency] = useState(false);
    const [displayValue, setDisplayValue] = useState("");

    const category = getCategories()[categoryID];
    const currency = currentCurrency();
    const Icon = Icons[category?.icon] || Icons.CircleDollarSign;

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isEdit && currencyConversion) {
            setLabelCurrency(currencyConversion);
        }
    }, [currencyConversion]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Format display value when amount changes
    useEffect(() => {
        if (amount !== undefined && amount !== null) {
            // Format with commas for display only
            setDisplayValue(amount.toString());
        } else {
            setDisplayValue("");
        }
    }, [amount]);

    // Load conversion settings/rate on mount
    useEffect(() => {
        const savedCurrencyConversion = localStorage.getItem("currencyConversion");
        const savedRates = localStorage.getItem("currencyRates");
        const savedFromCurrency = localStorage.getItem("fromCurrency");
        const customCurrencyConversion = localStorage.getItem("customCurrencyConversion");
        const customCurrencyConversionPrice = localStorage.getItem("customCurrencyConversionPrice");

        if (savedCurrencyConversion && JSON.parse(savedCurrencyConversion) === true && savedRates && !isEdit) {
            setCurrencyConversion(true);
            if (savedFromCurrency) {
                setFromCurrency(savedFromCurrency);
            }

            const parsedRates = JSON.parse(savedRates);
            let currentRate =
                parsedRates?.rates?.[savedFromCurrency]?.conversion_rates?.[currency] || 1;
            if (customCurrencyConversion && JSON.parse(customCurrencyConversion) === true && customCurrencyConversionPrice) {
                currentRate = +JSON.parse(customCurrencyConversionPrice);
            }
            setRatePrice(currentRate);
        }
    }, [currency]);

    const handleBlur = () => {
        if (currencyConversion && !isEdit) {
            const convertedValue = amount * ratePrice;
            setConvertedAmount(+convertedValue);
            setLabelCurrency(false);
            onAmountChange(+convertedValue.toFixed(2));
        }
    };

    const handleFocus = () => {
        if (currencyConversion && !isEdit) {
            const revertedValue = convertedAmount / ratePrice;
            setLabelCurrency(true);
            onAmountChange(revertedValue);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Get the raw value typed by user
        const rawValue = e.target.value;

        // Remove commas to get the actual numeric value
        const numericValue = rawValue.replace(/,/g, '');

        // Update the actual amount value (without commas)
        onAmountChange(parseFloat(numericValue) || 0);
    };

    // Disable conversion
    const disableConversion = () => {
        const confirmed = window.confirm("You will disable currency conversion only for this expense. To permanently disable currency conversion, please go to Settings.");
        if (!confirmed) return;

        // localStorage.setItem("currencyConversion", JSON.stringify(false));
        setCurrencyConversion(false);

        // Optionally reset amount to 0 if you like
        onAmountChange(0);
    };

    return (
        <>
            <div className={"space-y-2 relative" + (!currencyConversion ? " mb-2" : "")}>
                <div className="flex items-center rounded-lg p-2">
                    {/* Back button with category color/icon */}
                    <div
                        className="w-12 ar-1 rounded-full flex items-center justify-center"
                        onClick={onBack}
                        style={{ backgroundColor: category?.color }}
                    >
                        <Icon className="h-4 w-4" style={{ color: "white" }} />
                    </div>

                    {/* Amount Input */}
                    <div className="relative ml-4 w-full">
                        {/* Visible formatted input (for display only) */}
                        <div
                            className="w-full bg-transparent text-2xl font-bold text-right"
                            style={{ color: category?.color }}
                        >
                            {formatWithCommas(displayValue)}
                        </div>

                        {/* Actual hidden input for handling raw numeric values */}
                        <Input
                            id="amount"
                            type="number"
                            step="0.5"
                            required
                            ref={inputRef}
                            value={amount || ""}
                            placeholder="0.00"
                            onChange={handleInputChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-text"
                        />
                    </div>

                    <span className="ml-2 text-2xl font-bold" style={{ color: category?.color }}>
                        {labelCurrency ? fromCurrency : currency}
                    </span>
                </div>

                <div
                    className="colored-bg-outline"
                    style={{ backgroundColor: category?.color + "22" }}
                ></div>
            </div>

            {/* Conversion Info / Disable link */}
            {currencyConversion && (
                <div className="text-center !m-0 !p-0 !mt-1 text-gray-600 text-xs flex justify-between">
                    Conversion: {fromCurrency} → {currency} ( {ratePrice} )
                    <span className="text-red-700 text-xs cursor-pointer font-bold" onClick={disableConversion}>
                        Disable it!
                      </span>
                </div>
            )}
        </>
    );
}
