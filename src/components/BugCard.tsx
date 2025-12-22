import { Bug } from '@/types/bug';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TypeBadge } from './TypeBadge';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BugCardProps {
  bug: Bug;
}

export function BugCard({ bug }: BugCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/bug/${bug.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">{bug.id}</span>
            <TypeBadge type={bug.type} />
          </div>
          <h3 className="font-semibold text-sm line-clamp-2">{bug.title}</h3>
        </div>
        <PriorityBadge priority={bug.priority} />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {bug.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {bug.labels.map((label) => (
          <Badge key={label} variant="secondary" className="text-xs">
            {label}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {bug.assigneeName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{bug.assigneeName}</span>
            </div>
          )}
          {bug.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(bug.dueDate).toLocaleDateString('it-IT')}</span>
            </div>
          )}
        </div>
        <StatusBadge status={bug.status} />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Aggiornato {formatDistanceToNow(bug.updatedAt, { addSuffix: true, locale: it })}
      </div>
    </Card>
  );
}
