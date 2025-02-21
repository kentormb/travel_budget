
import * as icons from "lucide-react";

interface IconComponentProps {
  iconName: string;
  size?: number;
}

export function IconComponent({ iconName, size = 4 }: IconComponentProps) {
  const Icon = (icons as any)[iconName];
  return Icon ? <Icon className={`h-${size} w-${size}`} /> : null;
}
