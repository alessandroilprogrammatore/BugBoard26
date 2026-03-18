import { Badge } from '@/components/ui/badge';
import { BugType } from '@/types/bug';
import { Bug, Lightbulb, HelpCircle, FileText } from 'lucide-react';

interface TypeBadgeProps {
  type: BugType;
}

const typeConfig = {
  bug: {
    label: 'Bug',
    className: 'border-[hsl(var(--type-bug))] text-[hsl(var(--type-bug))]',
    icon: Bug,
  },
  feature: {
    label: 'Feature',
    className: 'border-[hsl(var(--type-feature))] text-[hsl(var(--type-feature))]',
    icon: Lightbulb,
  },
  question: {
    label: 'Domanda',
    className: 'border-[hsl(var(--type-question))] text-[hsl(var(--type-question))]',
    icon: HelpCircle,
  },
  documentation: {
    label: 'Docs',
    className: 'border-[hsl(var(--type-documentation))] text-[hsl(var(--type-documentation))]',
    icon: FileText,
  },
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const config = typeConfig[type] ?? typeConfig.bug;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

