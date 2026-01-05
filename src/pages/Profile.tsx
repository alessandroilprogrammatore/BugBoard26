import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Disconnesso con successo');
    navigate('/login');
  };

  const roleLabels = {
    admin: 'Amministratore',
    user: 'Utente',
    readonly: 'Solo lettura',
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Profilo</h1>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <Badge variant="secondary">{user && roleLabels[user.role]}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Ruolo</div>
                <div className="font-medium">{user && roleLabels[user.role]}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">ID Utente</div>
                <div className="font-medium font-mono">{user?.id}</div>
              </div>
            </div>
          </div>
        </Card>

        {isAdmin && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Amministrazione</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/admin/users')}
              >
                Gestione utenti e ruoli
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/reports')}
              >
                Report mensili
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/archive')}
              >
                Archivio
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Preferenze</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/export')}
            >
              Esporta dati
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/readonly')}
            >
              Modalità solo lettura
            </Button>
          </div>
        </Card>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>
    </Layout>
  );
}
