import { Badge } from '@/components/ui/badge';
import { BugStatus } from '@/types/bug';
import { Circle, PlayCircle, CheckCircle, Archive } from 'lucide-react';

interface StatusBadgeProps {
  status: BugStatus;
}

const statusConfig = {
  todo: {
    label: 'Da fare',
    className: 'bg-[hsl(var(--status-todo))] text-[hsl(var(--status-todo-foreground))]',
    icon: Circle,
  },
  in_progress: {
    label: 'In corso',
    className: 'bg-[hsl(var(--status-progress))] text-[hsl(var(--status-progress-foreground))]',
    icon: PlayCircle,
  },
  resolved: {
    label: 'Risolto',
    className: 'bg-[hsl(var(--status-resolved))] text-[hsl(var(--status-resolved-foreground))]',
    icon: CheckCircle,
  },
  archived: {
    label: 'Archiviato',
    className: 'bg-[hsl(var(--status-archived))] text-[hsl(var(--status-archived-foreground))]',
    icon: Archive,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
