import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { countries } from "@/data/countries";
import { CountryItem } from "./country/CountryItem";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  isFilter?: boolean;
}

export function CountrySelect({ value, onChange, isFilter = false }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selectedCountry = countries.find(
    (country) => country.code.toLowerCase() === value
  );

  const handleCountryChange = (currentValue) => {
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    if (isFilter) {
      return;
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <div className="flex items-center gap-2">
              <img
                src={`https://flagcdn.com/24x18/${value.toLowerCase()}.png`}
                width="24"
                height="18"
                alt={value}
              />
              {selectedCountry?.name}
            </div>
          ) : (
            "Select country..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                  <CommandItem
                      key={country.code}
                      value={country.name.toLowerCase()}
                      onSelect={() => handleCountryChange(country.code.toLowerCase())}
                  >
                    <CountryItem
                        code={country.code}
                        name={country.name}
                        isSelected={value === country.code.toLowerCase()}
                        onSelect={() => handleCountryChange(country.code.toLowerCase())}
                    />
                  </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
