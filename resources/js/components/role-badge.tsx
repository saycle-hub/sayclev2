import { Badge } from '@/components/ui/badge';
const roles = { admin: ['Admin', 'bg-[#18352a] text-white'], officer: ['Petugas', 'bg-[#2f6848] text-white'], partner: ['Mitra', 'bg-[#e88c12] text-[#18352a]'] } as const;
export function RoleBadge({ role }: { role: string }) { const [label, className] = roles[role as keyof typeof roles] ?? ['Peran tidak dikenal', 'bg-[#18352a] text-white']; return <Badge className={className}>{label}</Badge>; }
