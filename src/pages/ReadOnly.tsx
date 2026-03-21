import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { BugCard } from '@/components/BugCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Eye, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function ReadOnly() {
  const navigate = useNavigate();
  const [visibleBugs, setVisibleBugs] = useState<any[]>([]);

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    try {
      const response = await api('/bugs?size=5');
      const bugs = (response.content || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        type: b.type.toLowerCase(),
        status: String(b.status || 'TODO').toLowerCase().replace(/\\s+/g, '_'),
        priority: b.priority?.toLowerCase(),
        labels: b.labels?.map((l: any) => l.name) || [],
        assignee: b.assignee?.id,
        assigneeName: b.assignee?.name,
        createdBy: b.createdBy.id,
        createdByName: b.createdBy.name,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.createdAt),
      }));
      setVisibleBugs(bugs);
    } catch (error) {
      console.error('Failed to load bugs:', error);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Modalita solo lettura</h1>
        </div>

        <Alert className="mb-6">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            In questo ruolo puoi consultare i bug e segnalarne di nuovi, ma non puoi
            modificare quelli esistenti o gestire operazioni amministrative.
          </AlertDescription>
        </Alert>

        <Card className="p-4 mb-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Cosa puoi fare:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Visualizzare lista bug e dettagli</li>
                <li>Creare nuove issue</li>
                <li>Leggere commenti e cronologia</li>
                <li>Cercare e filtrare bug</li>
              </ul>
              <p className="font-medium mt-3">Cosa non puoi fare:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Modificare bug esistenti</li>
                <li>Aggiungere commenti</li>
                <li>Cambiare stati o assegnazioni</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold">Bug recenti</h2>
          {visibleBugs.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate('/bugs')}>
            Torna alla lista completa
          </Button>
        </div>
      </div>
    </Layout>
  );
}
