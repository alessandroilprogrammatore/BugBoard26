import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function Reports() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await api('/admin/metrics');
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBugs = metrics ? (metrics.open + metrics.inProgress + metrics.resolved + metrics.archived) : 0;
  const resolvedBugs = metrics?.resolved || 0;
  const resolutionRate = totalBugs > 0 ? Math.round((resolvedBugs / totalBugs) * 100) : 0;
  const avgResolutionTime = metrics ? `${metrics.avgResolutionDays.toFixed(1)} giorni` : '-';

  // Build user stats from assignedPerUser map
  const userStats = metrics?.assignedPerUser
    ? Object.entries(metrics.assignedPerUser).map(([email, count]: [string, any]) => ({
      email,
      assigned: count,
    }))
    : [];

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Report Mensili</h1>
        </div>

        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground">Caricamento metriche...</div>
        ) : (
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

            {userStats.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Bug Assegnati per Utente</h2>
                <div className="space-y-3">
                  {userStats.map((stat) => (
                    <Card key={stat.email} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{stat.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{stat.assigned}</div>
                          <div className="text-xs text-muted-foreground">assegnati</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate('/export')}>
              Esporta report completo
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

