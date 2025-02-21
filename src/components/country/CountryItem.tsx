import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryItemProps {
  code: string;
  name: string;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

export function CountryItem({ code, name, isSelected, onSelect }: CountryItemProps) {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer px-2 py-1.5 hover:bg-accent"
      onClick={() => onSelect(code.toLowerCase())}
    >
      <img
        src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
        width="24"
        height="18"
        alt={code}
      />
      {name}
      <Check
        className={cn(
          "ml-auto h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}