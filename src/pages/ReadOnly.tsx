import { Layout } from '@/components/Layout';
import { BugCard } from '@/components/BugCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockBugs } from '@/data/mockData';
import { ArrowLeft, Eye, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReadOnly() {
  const navigate = useNavigate();

  // Mostra solo bug aperti in modalità readonly
  const visibleBugs = mockBugs.filter((b) => b.status !== 'archived').slice(0, 5);

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Modalità Solo Lettura</h1>
        </div>

        <Alert className="mb-6">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Stai visualizzando i bug in modalità solo lettura. Non puoi creare, modificare
            o eliminare bug.
          </AlertDescription>
        </Alert>

        <Card className="p-4 mb-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Cosa puoi fare:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Visualizzare lista bug e dettagli</li>
                <li>Leggere commenti e cronologia</li>
                <li>Cercare e filtrare bug</li>
              </ul>
              <p className="font-medium mt-3">Cosa non puoi fare:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Creare o modificare bug</li>
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
