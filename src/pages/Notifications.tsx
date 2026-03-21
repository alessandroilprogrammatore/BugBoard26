import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  bug?: { id: string; title: string };
  bugId?: string;
  bugTitle?: string;
  sender: { name: string; email: string } | null;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await api('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Errore nel caricamento notifiche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Tutte le notifiche segnate come lette');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Errore');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const getBugTarget = (notification: NotificationItem) =>
    notification.bug?.id ?? notification.bugId;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifiche</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} non lette`
                : 'Nessuna notifica non letta'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Segna tutte lette
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground">Caricamento...</div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-16 w-16" />}
            title="Nessuna notifica"
            description="Quando riceverai notifiche appariranno qui"
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition-all ${
                  !notification.read
                    ? 'border-primary/50 bg-primary/5'
                    : 'opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </span>
                      {notification.sender && (
                        <span className="text-xs text-muted-foreground">
                          da {notification.sender.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!getBugTarget(notification)}
                      onClick={() => {
                        const bugTarget = getBugTarget(notification);
                        if (bugTarget) {
                          navigate(`/bug/${bugTarget}`);
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <CheckCheck className="h-3 w-3" />
                      </Button>
                    )}
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
