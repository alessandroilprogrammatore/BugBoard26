import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Bug, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function Home() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    open: 0,
    assignedToMe: 0,
    resolved: 0,
    dueSoon: 0,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      if (isAdmin) {
        const data = await api('/admin/metrics');
        setMetrics({
          open: data.open || 0,
          assignedToMe: data.inProgress || 0,
          resolved: data.resolved || 0,
          dueSoon: data.archived || 0,
        });
      } else {
        // For non-admin users, load bugs and compute locally
        const response = await api('/bugs?size=100');
        const bugs = response.content || [];
        setMetrics({
          open: bugs.filter((b: any) => b.status === 'TODO').length,
          assignedToMe: bugs.filter((b: any) => b.assignee?.id === user?.id).length,
          resolved: bugs.filter((b: any) => b.status === 'RESOLVED').length,
          dueSoon: bugs.filter((b: any) =>
            b.deadline &&
            new Date(b.deadline) > new Date() &&
            new Date(b.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ).length,
        });
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const stats = [
    { label: 'Bug aperti', value: metrics.open, icon: Bug, color: 'text-primary' },
    { label: 'Assegnati a me', value: metrics.assignedToMe, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Risolti', value: metrics.resolved, icon: CheckCircle, color: 'text-success' },
    { label: 'Scadenze prossime', value: metrics.dueSoon, icon: Clock, color: 'text-destructive' },
  ];

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Benvenuto, {user?.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="p-4 cursor-pointer glass glass-hover"
                onClick={() => navigate('/bugs')}
              >
                <div className="flex flex-col gap-2">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Azioni rapide</h2>
          <div className="space-y-2">
            <Card
              className="p-4 cursor-pointer glass glass-hover"
              onClick={() => navigate('/bugs')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Visualizza tutti i bug</span>
                <Bug className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
            <Card
              className="p-4 cursor-pointer glass glass-hover"
              onClick={() => navigate('/bug/new')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Crea nuovo bug</span>
                <span className="text-2xl">+</span>
              </div>
            </Card>
            {user?.role === 'admin' && (
              <Card
                className="p-4 cursor-pointer glass glass-hover"
                onClick={() => navigate('/admin/users')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Gestione utenti</span>
                  <span className="text-muted-foreground">Admin</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

