import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Category } from "@/types/category";
import { CategoryForm } from "./category/CategoryForm";
import { CategoryList } from "./category/CategoryList";

interface CategoryManagementProps {
  categories: { [key: string]: Category };
  onUpdateCategories: (categories: { [key: string]: Category }) => void;
}

export function CategoryManagement({
                                     categories,
                                     onUpdateCategories,
                                   }: CategoryManagementProps) {
  // Track whether we're currently editing a category, or adding a new one
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleAddCategory = (newCategoryData: Category) => {
    // If category with that ID already exists, fail early (optional check)
    if (categories[newCategoryData.id]) {
      toast.error("A category with this ID already exists!");
      return;
    }

    const updatedCategories = {
      ...categories,
      [newCategoryData.id]: newCategoryData,
    };

    onUpdateCategories(updatedCategories);
    toast.success("Category added successfully!");
  };

  const handleUpdateCategory = (updatedCategoryData: Category) => {
    const updatedCategories = {
      ...categories,
      [updatedCategoryData.id]: updatedCategoryData,
    };

    onUpdateCategories(updatedCategories);
    toast.success("Category updated successfully!");
  };

  const handleDeleteCategory = (id: string) => {
    const { [id]: removed, ...remainingCategories } = categories;
    onUpdateCategories(remainingCategories);
    toast.success("Category deleted successfully!");
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
  };

  const handleFormCancel = () => {
    setEditingCategory(null);
  };

  return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full md:w-auto text-sm mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-screen h-full sm:h-auto overflow-y-auto flex flex-col" aria-describedby="">
          <DialogHeader>
            <DialogTitle>Category Management</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-2">
            <CategoryForm
                initialCategory={editingCategory}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onCancelEdit={handleFormCancel}
            />
            <CategoryList
                categories={categories}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
            />
          </div>
        </DialogContent>
      </Dialog>
  );
}

export default CategoryManagement;
