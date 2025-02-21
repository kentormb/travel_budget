
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as icons from "lucide-react";
import { Category } from "@/types/category";

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories: { [key: string]: Category };
}

export function CategorySelector({ selectedCategory, onSelectCategory, categories }: CategorySelectorProps) {
  const IconComponent = ({ iconName, color }: { iconName: string, color: string }) => {
    const Icon = (icons as any)[iconName];
    return Icon ? <Icon className="!h-6 !w-6" style={{color: color}} /> : null;
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm">Select Category</Label>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Object.values(categories).map((category) => (
          <Button
            key={category.id}
            variant="outline"
            className={`h-auto flex flex-col items-center justify-center gap-1 p-2 sm:p-3 text-xs sm:text-sm ${
              selectedCategory === category.id ? 'ring-2 ring-primary' : ''
            }`}
            style={{
              backgroundColor: selectedCategory === category.id ? `${category.color}20` : 'transparent',
              borderColor: category.color
            }}
            onClick={() => onSelectCategory(category.id)}
          >
            <IconComponent iconName={category.icon} color={category.color} />
            <span className="text-center line-clamp-2">{category.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

