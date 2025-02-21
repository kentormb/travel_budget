
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Categories {
  [key: string]: Category;
}
