import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconComponent } from "./IconComponent";
import { Category } from "@/types/category";
import { availableIcons } from "@/config/icons";

// Utility to slugify the category name -> id
function slugify(value: string) {
  return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
}

interface CategoryFormProps {
  // If this is null, we're adding a new category; otherwise, we're editing
  initialCategory: Category | null;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onCancelEdit: () => void;
}

export function CategoryForm({
                               initialCategory,
                               onAddCategory,
                               onUpdateCategory,
                               onCancelEdit,
                             }: CategoryFormProps) {
  const isEditMode = Boolean(initialCategory);

  const [formCategory, setFormCategory] = useState<Category>({
    id: "",
    name: "",
    color: "#000000",
    icon: "activity",
  });

  useEffect(() => {
    // If we have an initialCategory, populate the form
    if (initialCategory) {
      setFormCategory(initialCategory);
    } else {
      // Otherwise, reset to default
      setFormCategory({
        id: "",
        name: "",
        color: "#000000",
        icon: "activity",
      });
    }
  }, [initialCategory]);

  // Whenever the name changes (and we are *not* in edit mode), auto-generate an ID (slug).
  // If in edit mode, don't forcibly regenerate the slug so the user can keep or change it.
  useEffect(() => {
    if (!isEditMode) {
      setFormCategory((prev) => ({
        ...prev,
        id: slugify(prev.name),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCategory.name, isEditMode]);

  const handleSubmit = () => {
    if (!formCategory.name?.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (!formCategory.id?.trim()) {
      toast.error("Please enter a category ID");
      return;
    }

    if (isEditMode) {
      onUpdateCategory(formCategory);
      onCancelEdit();
    } else {
      onAddCategory(formCategory);
      // Reset the form after adding
      setFormCategory({
        id: "",
        name: "",
        color: "#000000",
        icon: "activity",
      });
    }
  };

  return (
      <div className="grid gap-4 p-2 border-b">
        {/* Title */}
        <h3 className="text-lg font-semibold">
          {isEditMode ? "Edit Category" : "Add Category"}
        </h3>

        {/* Category Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Category Name</Label>
          <Input
              id="name"
              value={formCategory.name}
              onChange={(e) =>
                  setFormCategory({ ...formCategory, name: e.target.value })
              }
              placeholder="Enter category name"
              className="h-9 text-sm"
          />
        </div>

        {/* Slug/ID Field */}
        <div className="space-y-2">
          <Label htmlFor="id">Category ID (slug)</Label>
          <Input
              id="id"
              value={formCategory.id}
              onChange={(e) =>
                  setFormCategory({ ...formCategory, id: e.target.value })
              }
              placeholder="auto-generated from name"
              className="h-9 text-sm"
          />
        </div>

        {/* Icon Selector */}
        <div className="space-y-2">
          <Label htmlFor="icon">Category Icon</Label>
          <Select
              value={formCategory.icon}
              onValueChange={(value) =>
                  setFormCategory({ ...formCategory, icon: value })
              }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto">
              {availableIcons.map((icon) => (
                  <SelectItem key={icon.value} value={icon.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent iconName={icon.value} />
                      <span>{icon.label}</span>
                    </div>
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color">Category Color</Label>
          <Input
              id="color"
              type="color"
              value={formCategory.color}
              onChange={(e) =>
                  setFormCategory({ ...formCategory, color: e.target.value })
              }
              className="h-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} className="h-9 text-sm">
            {isEditMode ? "Update Category" : "Add Category"}
          </Button>

          {isEditMode && (
              <Button variant="outline" onClick={onCancelEdit} className="h-9 text-sm">
                Cancel
              </Button>
          )}
        </div>
      </div>
  );
}
