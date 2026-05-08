import { Badge } from "@/components/ui/badge";

interface HeaderStatPillProps {
  label: string;
  value: number | string;
}

export function HeaderStatPill({ label, value }: HeaderStatPillProps) {
  return (
    <Badge
      variant="outline"
      className="border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
    >
      {label}: <span className="ml-1 font-semibold">{value}</span>
    </Badge>
  );
}
