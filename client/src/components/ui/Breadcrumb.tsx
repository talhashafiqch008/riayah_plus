import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Global `a { min-height/min-width: 44px }` in index.css misaligns
 * breadcrumb links next to plain text — override on these links only.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-row flex-nowrap items-center gap-1.5 text-sm leading-none text-stone-500"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="contents">
            {i > 0 && (
              <ChevronRight className="size-3.5 shrink-0 text-stone-300" aria-hidden />
            )}
            {isLast || !item.href ? (
              <span className={isLast ? 'font-medium text-stone-900' : undefined}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-teal-700 transition-colors"
                style={{ minHeight: 0, minWidth: 0 }}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
