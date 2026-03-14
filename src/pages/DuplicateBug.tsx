import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/api/client';

export default function DuplicateBug() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState<any>(null);
  const [allBugs, setAllBugs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOriginal, setSelectedOriginal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const bugData = await api(`/bugs/${id}`);
      setBug(bugData);

      const response = await api('/bugs?size=200');
      setAllBugs((response.content || []).filter((b: any) => b.id !== id));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout showNav={false}>
        <div className="p-4">Caricamento...</div>
      </Layout>
    );
  }

  if (!bug) {
    return (
      <Layout showNav={false}>
        <div className="p-4">Bug non trovato</div>
      </Layout>
    );
  }

  const filteredBugs = search
    ? allBugs.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase())
    )
    : allBugs.slice(0, 5);

  const handleMarkDuplicate = async () => {
    if (!selectedOriginal) {
      toast.error('Seleziona il bug originale');
      return;
    }

    try {
      await api(`/bugs/${id}/duplicate-of/${selectedOriginal}`, {
        method: 'POST',
      });
      toast.success('Bug segnato come duplicato e chiuso');
      setTimeout(() => navigate(`/bug/${id}`), 500);
    } catch (error) {
      console.error('Failed to mark as duplicate:', error);
      toast.error('Errore nella marcatura come duplicato');
    }
  };

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Segna come Duplicato</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Questo bug:</span>{' '}
            <span className="font-medium">{bug.title}</span>
          </div>
        </Card>

        <Alert className="mb-4">
          <AlertDescription>
            Segna questo bug come duplicato di un altro. Il bug verrà chiuso
            automaticamente.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label>Cerca bug originale</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per titolo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredBugs.map((b) => (
              <Card
                key={b.id}
                className={`p-3 cursor-pointer transition-all ${selectedOriginal === b.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow-md'
                  }`}
                onClick={() => setSelectedOriginal(b.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{b.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{b.status} · {b.type}</div>
                  </div>
                  {selectedOriginal === b.id && (
                    <div className="text-primary">✓</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleMarkDuplicate} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Segna come duplicato
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Annulla
          </Button>
        </div>
      </div>
    </Layout>
  );
}

