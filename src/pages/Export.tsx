import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Export() {
  const navigate = useNavigate();

  const formats = [
    {
      value: 'csv',
      label: 'CSV',
      icon: FileText,
      url: '/api/export/bugs.csv',
      description: 'File CSV per Excel o altri fogli di calcolo'
    },
    {
      value: 'excel',
      label: 'Excel',
      icon: Table,
      url: '/api/export/bugs.xlsx',
      description: 'File Excel con formattazione automatica'
    },
    {
      value: 'pdf',
      label: 'PDF',
      icon: FileText,
      url: '/api/export/bugs.pdf',
      description: 'File PDF condivisibile pronto da stampare'
    },
  ];

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Layout showNav={false}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Esporta Dati</h1>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base mb-3 block">Formato di esportazione</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formats.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.value} className="p-4">
                    <div className="text-center space-y-3">
                      <Icon className="h-12 w-12 mx-auto text-primary" />
                      <div>
                        <div className="font-medium">{f.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {f.description}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleDownload(f.url)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica {f.label}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="p-4 bg-muted/50">
            <div className="text-sm space-y-2">
              <p className="font-semibold">Esporta tutti i bug</p>
              <p className="text-muted-foreground">
                I file includono: ID, titolo, descrizione, tipo, stato, priorità, assegnatario, data creazione ed etichette.
              </p>
              <p className="text-muted-foreground">
                L'esportazione avviene in tempo reale dal database.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
