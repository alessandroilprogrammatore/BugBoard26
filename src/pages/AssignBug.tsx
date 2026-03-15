import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserCheck, TrendingDown, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/api/client';

interface UserWithWorkload {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedCount: number;
}

export default function AssignBug() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState<any>(null);
  const [userWorkload, setUserWorkload] = useState<UserWithWorkload[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load bug details and server-computed workload in parallel
      const [bugData, workload] = await Promise.all([
        api(`/bugs/${id}`),
        api('/bugs/workload'),
      ]);
      setBug(bugData);
      setUserWorkload(workload);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Errore nel caricamento dati');
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

  const suggestedUser = userWorkload.length > 0 ? userWorkload[0] : null;

  const handleAssign = async () => {
    if (!selectedUser) {
      toast.error('Seleziona un utente');
      return;
    }

    try {
      await api(`/bugs/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assigneeId: selectedUser }),
      });
      toast.success('Bug assegnato con successo');
      setTimeout(() => navigate(`/bug/${id}`), 500);
    } catch (error) {
      console.error('Failed to assign bug:', error);
      toast.error("Errore nell'assegnazione");
    }
  };

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Assegna Bug</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Bug:</span>{' '}
            <span className="font-medium">{bug.title}</span>
          </div>
        </Card>

        {suggestedUser && (
          <Alert className="mb-4">
            <TrendingDown className="h-4 w-4" />
            <AlertDescription>
              Suggerimento: <span className="font-medium">{suggestedUser.name}</span> ha
              il carico di lavoro più basso ({suggestedUser.assignedCount} bug assegnati)
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 mb-6">
          <Label>Seleziona membro del team</Label>
          {userWorkload.map((user) => (
            <Card
              key={user.id}
              className={`p-4 cursor-pointer transition-all ${selectedUser === user.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:shadow-md'
                }`}
              onClick={() => setSelectedUser(user.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{user.assignedCount} bug</div>
                  <div className="text-xs text-muted-foreground">assegnati</div>
                </div>
              </div>
              {suggestedUser && user.id === suggestedUser.id && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                  <Star className="h-3 w-3 fill-primary" />
                  CONSIGLIATO
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAssign} className="flex-1">
            <UserCheck className="h-4 w-4 mr-2" />
            Assegna
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Annulla
          </Button>
        </div>
      </div>
    </Layout>
  );
}

