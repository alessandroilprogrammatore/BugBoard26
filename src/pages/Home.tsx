import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { mockBugs } from '@/data/mockData';
import { Bug, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openBugs = mockBugs.filter(
    (b) => b.status !== 'resolved' && b.status !== 'archived'
  ).length;
  const assignedToMe = mockBugs.filter((b) => b.assignee === user?.id).length;
  const resolvedBugs = mockBugs.filter((b) => b.status === 'resolved').length;
  const dueSoon = mockBugs.filter(
    (b) =>
      b.dueDate &&
      new Date(b.dueDate) > new Date() &&
      new Date(b.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).length;

  const stats = [
    { label: 'Bug aperti', value: openBugs, icon: Bug, color: 'text-primary' },
    { label: 'Assegnati a me', value: assignedToMe, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Risolti', value: resolvedBugs, icon: CheckCircle, color: 'text-success' },
    { label: 'Scadenze prossime', value: dueSoon, icon: Clock, color: 'text-destructive' },
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
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
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
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/bugs')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Visualizza tutti i bug</span>
                <Bug className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/bug/new')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Crea nuovo bug</span>
                <span className="text-2xl">+</span>
              </div>
            </Card>
            {user?.role === 'admin' && (
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
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
