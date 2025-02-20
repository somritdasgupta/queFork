import * as React from "react";
import { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SelectDropdownProps {
  trigger: React.ReactNode;
  items: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    className?: string;
  }[];
}

export function SelectDropdown({ trigger, items }: SelectDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-zinc-900 border border-zinc-800"
      >
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={item.onClick}
            className={cn(
              "flex items-center gap-2 text-sm cursor-pointer",
              "text-zinc-400 focus:text-zinc-100 focus:bg-zinc-800",
              item.className
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
