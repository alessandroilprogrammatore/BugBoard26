import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { mockNotifications } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(
    mockNotifications.filter((n) => n.userId === user?.id)
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    setNotifications(
      notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    navigate(`/bug/${notification.bugId}`);
  };

  const typeLabels = {
    assigned: 'Assegnazione',
    resolved: 'Risoluzione',
    mentioned: 'Menzione',
    commented: 'Commento',
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifiche</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} non {unreadCount === 1 ? 'letta' : 'lette'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Segna tutte lette
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-16 w-16" />}
            title="Nessuna notifica"
            description="Quando riceverai notifiche appariranno qui"
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-all ${
                  !notification.read
                    ? 'bg-primary/5 hover:shadow-md'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[notification.type]}
                      </Badge>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="font-medium text-sm mb-1">
                      {notification.message}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {notification.bugTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                        locale: it,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
