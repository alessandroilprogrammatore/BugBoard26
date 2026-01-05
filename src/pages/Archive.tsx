import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BugCard } from '@/components/BugCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockBugs } from '@/data/mockData';
import { ArrowLeft, Search, Archive as ArchiveIcon, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Archive() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const archivedBugs = mockBugs.filter((b) => b.status === 'archived');

  const filteredBugs = searchQuery
    ? archivedBugs.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : archivedBugs;

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Archivio</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca nell'archivio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {filteredBugs.length} bug archiviati
        </div>

        {filteredBugs.length === 0 ? (
          <EmptyState
            icon={<ArchiveIcon className="h-16 w-16" />}
            title="Nessun bug archiviato"
            description="I bug archiviati appariranno qui"
          />
        ) : (
          <div className="space-y-3">
            {filteredBugs.map((bug) => (
              <div key={bug.id} className="relative">
                <BugCard bug={bug} />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success('Bug ripristinato');
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Ripristina
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
