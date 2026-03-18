import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { BugCard } from '@/components/BugCard';
import { EmptyState } from '@/components/EmptyState';
import { BugListSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Filter, FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BugStatus, BugPriority, BugType } from '@/types/bug';
import { api } from '@/api/client';

export default function BugList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bugs, setBugs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'archived'>('all');
  const [statusFilter, setStatusFilter] = useState<BugStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<BugPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BugType | 'all'>('all');
  const [labelFilter, setLabelFilter] = useState<string>('');

  // Load bugs from API
  useEffect(() => {
    loadBugs();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadBugs();
  }, [statusFilter, priorityFilter, typeFilter, labelFilter, searchQuery, activeTab]);

  const loadBugs = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (activeTab === 'archived') {
        params.append('status', 'ARCHIVED');
      } else if (statusFilter !== 'all') {
        params.append('status', statusFilter.toUpperCase());
      }
      if (priorityFilter !== 'all') params.append('priority', priorityFilter.toUpperCase());
      if (typeFilter !== 'all') params.append('type', typeFilter.toUpperCase());
      if (labelFilter) params.append('label', labelFilter);
      if (searchQuery) params.append('q', searchQuery);

      const response = await api(`/bugs?${params.toString()}`);
      setBugs(response.content || []);
    } catch (error) {
      console.error('Failed to load bugs:', error);
      setBugs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Map backend bug to frontend bug format
  const mapBackendBugToFrontend = (backendBug: any) => ({
    id: backendBug.id,
    title: backendBug.title,
    description: backendBug.description,
    type: backendBug.type.toLowerCase(),
    status: String(backendBug.status || 'TODO').toLowerCase().replace(/\\s+/g, '_'),
    priority: backendBug.priority?.toLowerCase() || 'medium',
    labels: backendBug.labels?.map((l: any) => l.name) || [],
    assignee: backendBug.assignee?.id,
    assigneeName: backendBug.assignee?.name,
    createdBy: backendBug.createdBy.id,
    createdByName: backendBug.createdBy.name,
    createdAt: new Date(backendBug.createdAt),
    updatedAt: new Date(backendBug.createdAt), // Backend doesn't have updatedAt
    dueDate: backendBug.deadline ? new Date(backendBug.deadline) : undefined,
    archived: backendBug.archived,
  });

  let filteredBugs = bugs.map(mapBackendBugToFrontend);

  // Tab filter
  if (activeTab === 'mine') {
    filteredBugs = filteredBugs.filter((b) => b.assignee === user?.id);
  } else if (activeTab === 'archived') {
    filteredBugs = filteredBugs.filter((b) => b.archived);
  } else {
    filteredBugs = filteredBugs.filter((b) => !b.archived);
  }

  // Search filter
  if (searchQuery) {
    filteredBugs = filteredBugs.filter(
      (b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Status filter
  if (statusFilter !== 'all') {
    filteredBugs = filteredBugs.filter((b) => b.status === statusFilter);
  }

  // Priority filter
  if (priorityFilter !== 'all') {
    filteredBugs = filteredBugs.filter((b) => b.priority === priorityFilter);
  }

  // Type filter
  if (typeFilter !== 'all') {
    filteredBugs = filteredBugs.filter((b) => b.type === typeFilter);
  }

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Bug</h1>
          {!user?.role.includes('readonly') && (
            <Button size="sm" onClick={() => navigate('/bug/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Nuovo
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="mine">Assegnati a me</TabsTrigger>
            <TabsTrigger value="archived">Archiviati</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca bug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="todo">Da fare</SelectItem>
              <SelectItem value="in_progress">In corso</SelectItem>
              <SelectItem value="resolved">Risolto</SelectItem>
              <SelectItem value="archived">Archiviato</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="low">Bassa</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="question">Domanda</SelectItem>
              <SelectItem value="documentation">Documentazione</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Filtro etichette..."
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            className="w-[140px]"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredBugs.length} risultati
        </div>

        {isLoading ? (
          <BugListSkeleton />
        ) : filteredBugs.length === 0 ? (
          <EmptyState
            icon={<FileQuestion className="h-16 w-16" />}
            title="Nessun bug trovato"
            description="Prova a cambiare i filtri o crea un nuovo bug"
            action={
              !user?.role.includes('readonly')
                ? {
                    label: 'Crea bug',
                    onClick: () => navigate('/bug/new'),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredBugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} />
            ))}
          </div>
        )}
      </div>

      {!user?.role.includes('readonly') && (
        <button
          onClick={() => navigate('/bug/new')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          aria-label="Crea nuovo bug"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </Layout>
  );
}

