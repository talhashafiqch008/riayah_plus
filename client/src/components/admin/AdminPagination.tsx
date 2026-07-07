
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
 currentPage: number;
 totalPages: number;
 totalItems: number;
 perPage: number;
 onPageChange: (page: number) => void;
}

export function AdminPagination({
 currentPage,
 totalPages,
 totalItems,
 perPage,
 onPageChange,
}: PaginationProps) {
 if (totalPages <= 1) return null;

 const startItem = (currentPage - 1) * perPage + 1;
 const endItem = Math.min(currentPage * perPage, totalItems);

 return (
 <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-stone-200">
 <span className="text-sm text-stone-500">
 Showing {startItem} to {endItem} of {totalItems} results
 </span>
 <div className="flex items-center gap-2">
 <button
 onClick={() => onPageChange(currentPage - 1)}
 disabled={currentPage === 1}
 className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronLeft className="size-4" />
 Previous
 </button>
 <span className="text-sm text-stone-600 px-2">
 Page {currentPage} of {totalPages}
 </span>
 <button
 onClick={() => onPageChange(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Next
 <ChevronRight className="size-4" />
 </button>
 </div>
 </div>
 );
}
