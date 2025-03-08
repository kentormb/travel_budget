import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import { currentCurrency, getCategories } from "@/utils/helpers";
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
                    <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        required
                        ref={inputRef}
                        value={amount || ""}
                        placeholder="0.00"
                        onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="ml-4 w-full bg-transparent border-none outline-none text-2xl font-bold text-right ring-0 ring-transparent"
                        style={{ color: category?.color }}
                    />

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
