import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@data-room/shared";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.id ?? "root"} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            <button
              type="button"
              disabled={isLast}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "truncate rounded px-1.5 py-0.5 hover:bg-accent disabled:hover:bg-transparent",
                isLast ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              title={item.name}
            >
              {item.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
