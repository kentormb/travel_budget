
import { Categories } from "@/types/category";
import { CategoryManagement } from "../CategoryManagement";
import { CategorySelector } from "./CategorySelector";
import { DialogTitle } from "@/components/ui/dialog";

interface ExpenseCategoryStepProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories: Categories;
  onUpdateCategories: (categories: Categories) => void;
  isEdit?: boolean;
}

export function ExpenseCategoryStep({
  selectedCategory,
  onSelectCategory,
  categories,
  onUpdateCategories,
  isEdit
}: ExpenseCategoryStepProps) {
  return (
    <div className="space-y-6">
      <div className="max-h-[80vh] overflow-y-auto px-2">
        <CategorySelector
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          categories={categories}
        />
        <CategoryManagement
          categories={categories}
          onUpdateCategories={onUpdateCategories}
        />
      </div>
    </div>
  );
}
