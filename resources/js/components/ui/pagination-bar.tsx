import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function PaginationBar({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    className = '',
}: PaginationBarProps) {
    if (totalPages <= 1 && totalItems <= itemsPerPage) {
        return null; // No pagination needed if 1 page or less
    }

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={`flex flex-col items-center justify-between gap-3 border-t border-[#18352a]/10 px-4 py-3 sm:flex-row ${className}`}>
            <p className="text-xs font-medium text-[#18352a]/70">
                Menampilkan <span className="font-bold text-[#18352a]">{startItem}</span> - <span className="font-bold text-[#18352a]">{endItem}</span> dari <span className="font-bold text-[#18352a]">{totalItems}</span> data
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="h-8 gap-1 rounded-lg border-[#18352a]/15 px-2.5 text-xs text-[#18352a] hover:bg-[#18352a]/5 disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                </Button>

                {getPageNumbers().map((p, i) =>
                    typeof p === 'number' ? (
                        <Button
                            key={`page-${p}`}
                            variant={currentPage === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(p)}
                            className={`h-8 w-8 rounded-lg p-0 text-xs font-bold ${
                                currentPage === p
                                    ? 'bg-[#18352a] text-white hover:bg-[#0f231b]'
                                    : 'border-[#18352a]/15 text-[#18352a] hover:bg-[#18352a]/5'
                            }`}
                        >
                            {p}
                        </Button>
                    ) : (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-[#18352a]/40">
                            ...
                        </span>
                    )
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="h-8 gap-1 rounded-lg border-[#18352a]/15 px-2.5 text-xs text-[#18352a] hover:bg-[#18352a]/5 disabled:opacity-40"
                >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
