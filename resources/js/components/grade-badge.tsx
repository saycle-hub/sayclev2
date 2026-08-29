import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Grade = 'Layak' | 'Kurang Layak' | 'Tidak Layak';

const gradeStyles: Record<Grade, string> = {
    Layak: 'border-transparent bg-[#2f6848] text-[#f4f3ed] hover:bg-[#2f6848]/90',
    'Kurang Layak': 'border-transparent bg-[#e88c12] text-[#18352a] hover:bg-[#e88c12]/90',
    'Tidak Layak': 'border-transparent bg-[#6b4f2e] text-[#f4f3ed] hover:bg-[#6b4f2e]/90',
};

export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
    const style = gradeStyles[grade as Grade] ?? 'border-transparent bg-muted text-foreground';

    return (
        <Badge variant="outline" className={cn('font-semibold', style, className)}>
            {grade}
        </Badge>
    );
}
