import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, BarChart3, Calendar, CheckCircle2, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

interface MonthlyUserReport {
  email: string;
  opened: number;
  managed: number;
  resolved: number;
  avgResolutionDays: number;
}

interface MonthlyReport {
  opened: number;
  managed: number;
  resolved: number;
  openedPerUser: Record<string, number>;
  managedPerUser: Record<string, number>;
  resolvedPerUser: Record<string, number>;
  avgResolutionDays: number;
  avgResolutionDaysPerUser: Record<string, number>;
  users: MonthlyUserReport[];
}

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

export default function Reports() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport(selectedMonth);
  }, [selectedMonth]);

  const loadReport = async (month: string) => {
    try {
      setIsLoading(true);
      const data = await api(`/admin/reports/monthly?month=${month}`);
      setReport(data);
    } catch (error) {
      console.error('Failed to load monthly report:', error);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const avgResolutionTime = report ? `${report.avgResolutionDays.toFixed(1)} giorni` : '-';
  const activeUsers = report?.users.length || 0;

  return (
    <Layout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Report Mensili</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Periodo di analisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-2">
              <label htmlFor="report-month" className="text-sm font-medium">
                Mese
              </label>
              <Input
                id="report-month"
                type="month"
                value={selectedMonth}
                max={getCurrentMonth()}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground">Caricamento report mensile...</div>
        ) : !report ? (
          <div className="text-center p-8 text-muted-foreground">
            Impossibile caricare il report del mese selezionato.
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-3">Metriche Aggregate</h2>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Bug aperti</span>
                    </div>
                    <div className="text-3xl font-bold">{report.opened}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-warning" />
                      <span className="text-sm text-muted-foreground">Bug gestiti</span>
                    </div>
                    <div className="text-3xl font-bold">{report.managed}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="text-sm text-muted-foreground">Bug risolti</span>
                    </div>
                    <div className="text-3xl font-bold">{report.resolved}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tempo medio</span>
                    </div>
                    <div className="text-2xl font-bold">{avgResolutionTime}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dettaglio per Utente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {activeUsers} membri del team inclusi nel report del mese {selectedMonth}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead className="text-right">Aperti</TableHead>
                      <TableHead className="text-right">Gestiti</TableHead>
                      <TableHead className="text-right">Risolti</TableHead>
                      <TableHead className="text-right">Tempo medio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.users.map((user) => (
                      <TableRow key={user.email}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell className="text-right">{user.opened}</TableCell>
                        <TableCell className="text-right">{user.managed}</TableCell>
                        <TableCell className="text-right">{user.resolved}</TableCell>
                        <TableCell className="text-right">
                          {user.avgResolutionDays.toFixed(1)} giorni
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={() => navigate('/export')}>
              Esporta report completo
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
