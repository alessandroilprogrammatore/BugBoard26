import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import {
  ArrowLeft,
  Edit,
  Archive,
  UserPlus,
  Copy,
  Download,
  Calendar,
  User,
  MessageSquare,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isReadonly } = useAuth();
  const [bug, setBug] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      loadBugDetails();
    }
  }, [id]);

  const loadBugDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      // Load bug details
      const bugData = await api(`/bugs/${id}`);
      setBug(mapBackendBugToFrontend(bugData));

      // Load comments
      const commentsData = await api(`/bugs/${id}/comments`);
      setComments(commentsData.map((comment: any) => mapBackendCommentToFrontend(comment, id)));

      // Load history
      const historyData = await api(`/bugs/${id}/history`);
      setHistory(historyData.map((event: any) => mapBackendHistoryToFrontend(event, id)));

    } catch (error) {
      console.error('Failed to load bug details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Map backend bug to frontend bug format
  const mapBackendBugToFrontend = (backendBug: any) => ({
    id: backendBug.id,
    title: backendBug.title,
    description: backendBug.description,
    type: backendBug.type.toLowerCase(),
    status: String(backendBug.status || 'TODO').toLowerCase().replace(/\\s+/g, '_'),
    priority: backendBug.priority?.toLowerCase(),
    labels: backendBug.labels?.map((l: any) => l.name) || [],
    assignee: backendBug.assignee?.id,
    assigneeName: backendBug.assignee?.name,
    createdBy: backendBug.createdBy.id,
    createdByName: backendBug.createdBy.name,
    createdAt: new Date(backendBug.createdAt),
    updatedAt: new Date(backendBug.createdAt),
    dueDate: backendBug.deadline ? new Date(backendBug.deadline) : undefined,
    attachments: backendBug.attachments || [],
    archived: backendBug.archived,
  });

  const mapBackendCommentToFrontend = (backendComment: any, bugId: string) => ({
    id: backendComment.id,
    bugId,
    userId: backendComment.author.id,
    userName: backendComment.author.name,
    content: typeof backendComment.text === 'string'
      ? backendComment.text.replace(/^"(.*)"$/, '$1')
      : '',
    createdAt: new Date(backendComment.createdAt),
  });

  const mapBackendHistoryToFrontend = (backendHistory: any, bugId: string) => ({
    id: backendHistory.id,
    bugId,
    userId: backendHistory.who.id,
    userName: backendHistory.who.name,
    type: mapHistoryActionToFrontend(backendHistory.action),
    oldValue: backendHistory.details,
    newValue: backendHistory.details,
    details: backendHistory.details,
    timestamp: new Date(backendHistory.at),
  });

  const mapHistoryActionToFrontend = (action: string) => {
    switch (action) {
      case 'CREATE': return 'created';
      case 'UPDATE': return 'status_changed';
      case 'ASSIGN': return 'assigned';
      case 'COMMENT': return 'commented';
      case 'ARCHIVE': return 'archived';
      case 'DUPLICATE': return 'duplicated';
      case 'LABELS_SET': return 'label_changed';
      default: return 'status_changed';
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api(`/bugs/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: newComment,
      });

      setNewComment('');
      await loadBugDetails(); // Reload to get new comment
      toast.success('Commento aggiunto');
    } catch (error) {
      toast.error('Errore nell\'aggiunta del commento');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!bug) {
    return (
      <Layout>
        <div className="p-4">
          <p>Bug non trovato</p>
        </div>
      </Layout>
    );
  }

  const canEdit = !isReadonly && (isAdmin || bug.assignee === user?.id);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';


  return (
    <Layout>
      <div className="pb-4">
        <div className="sticky top-0 bg-background border-b p-4 space-y-3 z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/bugs')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Home / Bug / {bug.id}
              </span>
            </div>
          </div>

          {isReadonly && (
            <Alert>
              <AlertDescription className="text-sm">
                Modalità solo lettura: non puoi modificare questo bug
              </AlertDescription>
            </Alert>
          )}

          {!isReadonly && (
            <div className="flex gap-2 overflow-x-auto">
              {canEdit && (
                <Button size="sm" onClick={() => navigate(`/bug/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/bug/${id}/assign`)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Assegna
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await api(`/bugs/${id}/archive`, { method: 'POST' });
                        toast.success('Bug archiviato');
                        setTimeout(() => navigate('/bugs'), 1000);
                      } catch (error) {
                        toast.error("Errore nell'archiviazione");
                      }
                    }}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archivia
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/bug/${id}/duplicate`)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicato
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/export')}
              >
                <Download className="h-4 w-4 mr-1" />
                Esporta
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-muted-foreground">{bug.id}</span>
              <TypeBadge type={bug.type} />
              <PriorityBadge priority={bug.priority} />
            </div>
            <h1 className="text-2xl font-bold mb-3">{bug.title}</h1>
            <StatusBadge status={bug.status} />
          </div>

          <Card className="p-4">
            <h2 className="font-semibold mb-2">Descrizione</h2>
            <p className="text-sm text-muted-foreground">{bug.description}</p>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Dettagli</h2>
            <div className="space-y-2 text-sm">
              {bug.assigneeName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assegnato a:</span>
                  <span className="font-medium">{bug.assigneeName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creato da:</span>
                <span className="font-medium">{bug.createdByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creato il:</span>
                <span className="font-medium">
                  {format(bug.createdAt, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                </span>
              </div>
              {bug.dueDate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scadenza:</span>
                  <span className="font-medium">
                    {format(bug.dueDate, 'd MMMM yyyy', { locale: it })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {bug.labels.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Etichette</h2>
              <div className="flex flex-wrap gap-2">
                {bug.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {bug.attachments?.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-5 w-5" />
                <h2 className="font-semibold">Allegati</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {bug.attachments.map((attachment: any) => {
                  const attachmentUrl = `${apiBaseUrl}/bugs/${bug.id}/attachments/${attachment.storedFilename}`;
                  return (
                    <a
                      key={attachment.storedFilename}
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <img
                        src={attachmentUrl}
                        alt={attachment.originalFilename}
                        className="w-full h-48 object-cover bg-muted"
                      />
                      <div className="p-3">
                        <div className="text-sm font-medium truncate">{attachment.originalFilename}</div>
                        <div className="text-xs text-muted-foreground">
                          {(attachment.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5" />
              <h2 className="font-semibold">Commenti ({comments.length})</h2>
            </div>

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-muted pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(comment.createdAt, "d MMM 'alle' HH:mm", { locale: it })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}

              {!isReadonly && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Input
                      placeholder="Aggiungi un commento..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment();
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddComment}>
                      Commenta
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">Cronologia</h2>
            <div className="space-y-3">
              {history.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{event.userName}</span>{' '}
                      {event.type === 'created' && 'ha creato il bug'}
                      {event.type === 'assigned' && `ha assegnato a ${event.newValue}`}
                      {event.type === 'status_changed' &&
                        `ha aggiornato il bug (${event.details})`}
                      {event.type === 'commented' && 'ha aggiunto un commento'}
                      {event.type === 'archived' && 'ha archiviato il bug'}
                      {event.type === 'duplicated' && 'ha segnato il bug come duplicato'}
                      {event.type === 'label_changed' && 'ha aggiornato le etichette'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(event.timestamp, "d MMM 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

