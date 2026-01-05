import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockBugs, mockUsers } from '@/data/mockData';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Reports() {
  const navigate = useNavigate();

  // Calcola metriche aggregate
  const totalBugs = mockBugs.length;
  const resolvedBugs = mockBugs.filter((b) => b.status === 'resolved').length;
  const resolutionRate = Math.round((resolvedBugs / totalBugs) * 100);
  const avgResolutionTime = '2.3 giorni'; // Placeholder

  // Metriche per utente
  const userStats = mockUsers
    .filter((u) => u.role !== 'readonly')
    .map((user) => {
      const assigned = mockBugs.filter((b) => b.assignee === user.id);
      const resolved = assigned.filter((b) => b.status === 'resolved');
      return {
        ...user,
        assigned: assigned.length,
        resolved: resolved.length,
        rate: assigned.length > 0 ? Math.round((resolved.length / assigned.length) * 100) : 0,
      };
    });

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Report Mensili</h1>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Metriche Aggregate</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Totale bug</span>
                </div>
                <div className="text-3xl font-bold">{totalBugs}</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="text-sm text-muted-foreground">Risolti</span>
                </div>
                <div className="text-3xl font-bold">{resolvedBugs}</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-warning" />
                  <span className="text-sm text-muted-foreground">Tasso risoluz.</span>
                </div>
                <div className="text-3xl font-bold">{resolutionRate}%</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tempo medio</span>
                </div>
                <div className="text-2xl font-bold">{avgResolutionTime}</div>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Metriche per Utente</h2>
            <div className="space-y-3">
              {userStats.map((stat) => (
                <Card key={stat.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{stat.name}</div>
                      <div className="text-sm text-muted-foreground">{stat.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{stat.rate}%</div>
                      <div className="text-xs text-muted-foreground">risoluzione</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assegnati: </span>
                      <span className="font-medium">{stat.assigned}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risolti: </span>
                      <span className="font-medium">{stat.resolved}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-6 bg-muted/50">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Grafici dettagliati disponibili nella versione completa
              </p>
            </div>
          </Card>

          <Button variant="outline" className="w-full" onClick={() => navigate('/export')}>
            Esporta report completo
          </Button>
        </div>
      </div>
    </Layout>
  );
}
