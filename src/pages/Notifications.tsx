import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Notifiche</h1>
          <p className="text-sm text-muted-foreground">
            Le notifiche relative ai bug assegnati appariranno qui
          </p>
        </div>

        <EmptyState
          icon={<Bell className="h-16 w-16" />}
          title="Nessuna notifica"
          description="Quando riceverai notifiche appariranno qui"
        />
      </div>
    </Layout>
  );
}

