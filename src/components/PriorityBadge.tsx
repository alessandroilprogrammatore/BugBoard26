import { Badge } from '@/components/ui/badge';
import { BugPriority } from '@/types/bug';
import { ChevronDown, Minus, ChevronUp, AlertTriangle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: BugPriority;
}

const priorityConfig = {
  low: {
    label: 'Bassa',
    className: 'bg-[hsl(var(--priority-low))] text-[hsl(var(--priority-low-foreground))]',
    icon: ChevronDown,
  },
  medium: {
    label: 'Media',
    className: 'bg-[hsl(var(--priority-medium))] text-[hsl(var(--priority-medium-foreground))]',
    icon: Minus,
  },
  high: {
    label: 'Alta',
    className: 'bg-[hsl(var(--priority-high))] text-[hsl(var(--priority-high-foreground))]',
    icon: ChevronUp,
  },
  urgent: {
    label: 'Urgente',
    className: 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))]',
    icon: AlertTriangle,
  },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
