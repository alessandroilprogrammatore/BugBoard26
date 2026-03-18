import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { BugType, BugPriority, BugStatus } from '@/types/bug';
import { api, apiUpload } from '@/api/client';

export default function BugForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<BugType>('bug');
  const [status, setStatus] = useState<BugStatus>('todo');
  const [priority, setPriority] = useState<BugPriority>('medium');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const loadBug = async () => {
      try {
        const bug = await api(`/bugs/${id}`);
        setTitle(bug.title || '');
        setDescription(bug.description || '');
        setType((bug.type?.toLowerCase() || 'bug') as BugType);
        setStatus((String(bug.status || 'TODO').toLowerCase().replace(/\\s+/g, '_') || 'todo') as BugStatus);
        setPriority((bug.priority?.toLowerCase() || 'medium') as BugPriority);
        setLabels(bug.labels?.map((label: { name: string } | string) =>
          typeof label === 'string' ? label : label.name
        ) || []);
        setDueDate(bug.deadline ? String(bug.deadline).slice(0, 10) : '');
      } catch (error) {
        toast.error('Errore nel caricamento del bug');
      }
    };

    loadBug();
  }, [id, isEdit]);

  const handleAddLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const validateImageFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return `Unsupported image type: ${file.type}. Supported formats are jpeg, png, gif, or webp.`;
    }

    if (file.size > maxSize) {
      return `File size exceeds maximum limit of 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateImageFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added successfully`);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (bugId: string): Promise<void> => {
    if (attachments.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);

        await apiUpload(`/bugs/${bugId}/attachments`, formData);

        toast.success(`Uploaded ${file.name}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload some attachments');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }

    if (!description.trim()) {
      toast.error('La descrizione è obbligatoria');
      return;
    }

    setIsSubmitting(true);

    try {
      let bugId: string;

      if (isEdit) {
        // Patch existing bug
        await api(`/bugs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            type: type.toUpperCase(),
            status: status.toUpperCase(),
            priority: priority.toUpperCase(),
            deadline: dueDate ? `${dueDate}T00:00:00` : null,
            labels: labels,
          }),
        });
        bugId = id!;
      } else {
        // Create new bug
        const created = await api('/bugs', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            type: type.toUpperCase(),
            priority: priority.toUpperCase(),
            deadline: dueDate ? `${dueDate}T00:00:00` : null,
            labels: labels,
          }),
        });
        bugId = created.id;
      }

      // Upload attachments if any
      if (attachments.length > 0) {
        await uploadAttachments(bugId);
      }

      toast.success(isEdit ? 'Bug aggiornato' : 'Bug creato');
      navigate('/bugs');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'Modifica Bug' : 'Nuovo Bug'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titolo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descrivi il problema in poche parole"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descrizione <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fornisci i dettagli del problema"
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as BugType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="question">Domanda</SelectItem>
                    <SelectItem value="documentation">Documentazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="status">Stato</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as BugStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Da fare</SelectItem>
                      <SelectItem value="in_progress">In corso</SelectItem>
                      <SelectItem value="resolved">Risolto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="priority">Priorità</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as BugPriority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Scadenza (opzionale)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Etichette</Label>
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Aggiungi etichetta"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddLabel} variant="outline">
                  Aggiungi
                </Button>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map((label) => (
                    <Badge key={label} variant="secondary" className="gap-1">
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(label)}
                        className="hover:bg-background/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allegati (opzionale)</Label>

              {/* File input */}
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Carica immagini (JPEG, PNG, GIF, WebP - max 5MB)
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <Label htmlFor="file-upload">
                    <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                      <span>
                        {isUploading ? 'Caricamento...' : 'Seleziona file'}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>

              {/* Selected files */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>File selezionati:</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm font-medium truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting || isUploading}>
              {isUploading ? 'Caricamento file...' : isSubmitting ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea bug'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting || isUploading}
            >
              Annulla
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

