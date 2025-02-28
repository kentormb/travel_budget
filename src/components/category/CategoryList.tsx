import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { IconComponent } from "./IconComponent";
import { Category } from "@/types/category";
import { useState } from "react";

interface CategoryListProps {
    categories: { [key: string]: Category };
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (id: string) => void;
}

export function CategoryList({
                                 categories,
                                 onEditCategory,
                                 onDeleteCategory,
                             }: CategoryListProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    return (
        <div className="space-y-2">
            <Label>Existing Categories</Label>
            <div className="grid gap-2 py-2">
                {Object.values(categories).map((category) => (
                    <div
                        key={category.id}
                        className={`flex items-center justify-between p-2 border rounded-md cursor-pointer ${category.id === selectedCategory ? 'ring-2 ring-green-600' : ''}`}
                        onClick={() => {
                            setSelectedCategory(category.id);
                            onEditCategory(category)}
                        }
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: category.color }}
                            >
                                <IconComponent iconName={category.icon} />
                            </div>
                            <span className="text-sm">{category.name}</span>
                        </div>
                        {/* Stop click propagation on the Trash icon so we don't also trigger edit */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCategory(category.id);
                            }}
                            className="h-8 w-8"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
