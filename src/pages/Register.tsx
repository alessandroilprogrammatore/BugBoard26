import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Bug, ArrowLeft, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/login')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al login
        </Button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-2xl mb-4">
            <Bug className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Registrazione</h1>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            La registrazione è gestita dall'amministratore. Questo form è solo dimostrativo.
          </AlertDescription>
        </Alert>

        <Card className="p-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Mario Rossi"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="mario@esempio.com"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                disabled
              />
            </div>

            <Button type="button" className="w-full" disabled>
              Registrati
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            Contatta l'amministratore per richiedere un account
          </p>
        </Card>
      </div>
    </div>
  );
}
