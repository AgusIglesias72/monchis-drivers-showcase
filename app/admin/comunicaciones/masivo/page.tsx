// app/admin/comunicaciones/masivo/page.tsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileText,
  Users,
  X,
  Info,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
  Variable,
  Eye,
  AlertTriangle,
  HelpCircle,
  Copy,
  Phone,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/admin/admin-header';
import Image from 'next/image';

interface ParsedRecipient {
  phone: string;
  name?: string;
  variables: Record<string, string>;
}

interface ParseResult {
  recipients: ParsedRecipient[];
  headers: string[];
  errors: string[];
}

// Parser local para preview en tiempo real
function parseRecipientsLocal(input: string): ParseResult {
  const lines = input.trim().split('\n').map(line => line.trim()).filter(Boolean);
  const recipients: ParsedRecipient[] = [];
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { recipients: [], headers: [], errors: [] };
  }

  const firstLine = lines[0];
  const firstLineParts = firstLine.split(',').map(p => p.trim().toLowerCase());
  
  const phoneKeywords = ['telefono', 'teléfono', 'phone', 'numero', 'número', 'number', 'cel', 'celular', 'mobile', 'whatsapp'];
  const hasHeader = firstLineParts.some(part => phoneKeywords.includes(part));
  
  let headers: string[] = [];
  let phoneIndex = 0;
  let startIndex = 0;

  if (hasHeader) {
    headers = firstLine.split(',').map(h => h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    phoneIndex = headers.findIndex(h => phoneKeywords.includes(h));
    
    if (phoneIndex === -1) {
      return { recipients: [], headers: [], errors: ['No se encontró columna de teléfono'] };
    }
    
    startIndex = 1;
  } else {
    const hasComma = firstLine.includes(',');
    
    if (hasComma) {
      const sampleParts = firstLine.split(',');
      headers = ['telefono', 'nombre'];
      for (let i = 2; i < sampleParts.length; i++) {
        headers.push(`columna${i + 1}`);
      }
    } else {
      headers = ['telefono'];
    }
    
    phoneIndex = 0;
    startIndex = 0;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    if (!line.includes(',') && headers.length === 1) {
      const phone = line.replace(/\D/g, '');
      
      if (phone.length < 8) {
        errors.push(`Línea ${lineNumber}: Número muy corto`);
        continue;
      }
      
      recipients.push({
        phone,
        name: undefined,
        variables: { nombre: 'Usuario' },
      });
    } else {
      const parts = line.split(',').map(p => p.trim());
      
      while (parts.length < headers.length) {
        parts.push('');
      }
      
      const phone = parts[phoneIndex]?.replace(/\D/g, '');
      
      if (!phone || phone.length < 8) {
        errors.push(`Línea ${lineNumber}: Teléfono inválido`);
        continue;
      }
      
      const variables: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        if (idx !== phoneIndex && parts[idx]) {
          variables[header] = parts[idx];
        }
      });
      
      const nameIndex = headers.findIndex(h => ['nombre', 'name'].includes(h));
      const name = nameIndex !== -1 ? parts[nameIndex] : undefined;
      
      if (!variables['nombre']) {
        variables['nombre'] = name || 'Usuario';
      }
      
      recipients.push({ phone, name, variables });
    }
  }

  const variableHeaders = headers.filter((_, idx) => idx !== phoneIndex);

  return { recipients, headers: variableHeaders, errors };
}

// Extraer variables del template
function extractVariables(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1).toLowerCase()))];
}

// Reemplazar variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let message = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    message = message.replace(regex, value || '');
  });
  return message;
}

export default function EnvioMasivoPage() {
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Single-tenant: el bot es siempre el mismo. Se manda al endpoint que lo
  // ignora (param legacy), pero lo dejamos consistente.
  const [botId] = useState<string>('whatsapp-bot');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');

  const [isValidating, setIsValidating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [sendResult, setSendResult] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'input' | 'csv'>('input');
  const [showPreviewTable, setShowPreviewTable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Parse recipients en tiempo real
  const parsedData = useMemo(() => {
    return parseRecipientsLocal(recipients);
  }, [recipients]);

  // Variables disponibles y usadas
  const availableVariables = useMemo(() => {
    const fromHeaders = parsedData.headers;
    if (!fromHeaders.includes('nombre')) {
      return ['nombre', ...fromHeaders];
    }
    return fromHeaders;
  }, [parsedData.headers]);

  const usedVariables = useMemo(() => {
    return extractVariables(message);
  }, [message]);

  const unusedVariables = useMemo(() => {
    return availableVariables.filter(v => !usedVariables.includes(v));
  }, [availableVariables, usedVariables]);

  const missingVariables = useMemo(() => {
    return usedVariables.filter(v => !availableVariables.includes(v));
  }, [usedVariables, availableVariables]);

  // Preview del primer mensaje
  const previewMessage = useMemo(() => {
    if (parsedData.recipients.length === 0) return message;
    return replaceVariables(message, parsedData.recipients[0].variables);
  }, [message, parsedData.recipients]);

  // Insertar variable en el mensaje
  const insertVariable = (variable: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) {
      setMessage(prev => prev + `{${variable}}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setMessage(before + `{${variable}}` + after);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Upload de imagen
  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir imagen');
      }

      const data = await response.json();
      setImageUrl(data.url);
      toast.success(`✅ Imagen subida: ${data.filename}`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir la imagen');
      setImageFile(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede pesar más de 5MB');
      return;
    }

    setImageFile(file);
    handleImageUpload(file);
  };

  // Validar
  const handleValidate = async () => {
    if (parsedData.recipients.length === 0) {
      toast.error('Agrega al menos un destinatario válido');
      return;
    }

    if (!message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    if (missingVariables.length > 0) {
      toast.error(`Variables no encontradas: {${missingVariables.join('}, {')}}`);
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/whatsapp/send-sequential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.trim(),
          message: message,
          imageUrl: imageUrl || undefined,
          botId: botId,
          delaySeconds: 5,
          testMode: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al validar');
        return;
      }

      setValidationResult(data);
      toast.success(`✅ Validación exitosa: ${data.total} destinatarios`);
    } catch (error) {
      console.error('Error validando:', error);
      toast.error('Error al validar destinatarios');
    } finally {
      setIsValidating(false);
    }
  };

  // Enviar
  const handleSend = async () => {
    if (!validationResult) {
      toast.error('Primero valida los destinatarios');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/whatsapp/send-sequential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.trim(),
          message: message,
          imageUrl: imageUrl || undefined,
          botId: botId,
          delaySeconds: 5,
          testMode: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al enviar');
        return;
      }

      setSendResult(data);
      toast.success(`🎉 Enviados: ${data.summary.successful}/${data.summary.total}`);
    } catch (error) {
      console.error('Error enviando:', error);
      toast.error('Error al enviar mensajes');
    } finally {
      setIsSending(false);
    }
  };

  // Limpiar
  const handleClear = () => {
    setRecipients('');
    setMessage('');
    setImageUrl('');
    setImageFile(null);
    setValidationResult(null);
    setSendResult(null);
    setShowPreviewTable(false);
    toast.info('Formulario limpiado');
  };

  // Cargar CSV
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRecipients(text);
      setValidationResult(null);
      toast.success('CSV cargado correctamente');
    };
    reader.readAsText(file);
  };

  // Drag and drop para CSV
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRecipients(text);
      setValidationResult(null);
      toast.success('CSV cargado correctamente');
    };
    reader.readAsText(file);
  };

  // Copiar ejemplo
  const copyExample = () => {
    const example = `telefono,nombre,empresa,codigo
595984039476,Juan Pérez,Acme Inc,ABC123
5491158165977,María González,Tech Corp,XYZ789
595981234567,Carlos López,StartupXYZ,DEF456`;
    navigator.clipboard.writeText(example);
    toast.success('Ejemplo copiado al portapapeles');
  };

  return (
    <TooltipProvider>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Envío Personalizado' },
        ]}
      />

      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Envío de Mensajes Personalizados</h1>
              <p className="text-muted-foreground mt-1">
                Envía mensajes personalizados con delay de 5s entre cada mensaje para evitar bloqueos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card de Destinatarios */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Destinatarios</CardTitle>
                        <CardDescription>
                          Pega datos o carga un CSV con columnas personalizadas
                        </CardDescription>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={copyExample}
                          className="cursor-pointer hover:bg-muted"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar ejemplo CSV</TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="input" className="gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" />
                        Pegar Datos
                      </TabsTrigger>
                      <TabsTrigger value="csv" className="gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Subir CSV
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="input" className="space-y-4 mt-4">
                      <Textarea
                        placeholder={`Formatos aceptados:

Solo números (uno por línea):
595984039476
5491158165977

CSV simple (telefono,nombre):
595984039476,Juan Pérez
5491158165977,María González

CSV con headers personalizados:
telefono,nombre,empresa,codigo
595984039476,Juan,Acme Inc,ABC123`}
                        value={recipients}
                        onChange={(e) => {
                          setRecipients(e.target.value);
                          setValidationResult(null);
                        }}
                        rows={10}
                        className="font-mono text-sm resize-none"
                      />
                    </TabsContent>

                    <TabsContent value="csv" className="space-y-4 mt-4">
                      <div 
                        className={`border-2 border-dashed rounded-lg p-10 text-center space-y-4 transition-colors cursor-pointer ${
                          isDragging 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => csvFileInputRef.current?.click()}
                      >
                        <Upload className={`h-12 w-12 mx-auto ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-base font-medium mb-1">
                            {isDragging ? '¡Suelta el archivo aquí!' : 'Selecciona un archivo o arrastra aquí'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CSV o TXT con columnas separadas por comas
                          </p>
                        </div>
                        <Input
                          ref={csvFileInputRef}
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleCsvUpload}
                          className="hidden"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Stats y Preview */}
                  {parsedData.recipients.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                            <Phone className="h-3.5 w-3.5" />
                            {parsedData.recipients.length} contactos
                          </Badge>
                          {parsedData.headers.length > 0 && (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1">
                              <Variable className="h-3.5 w-3.5" />
                              {parsedData.headers.length} variables
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreviewTable(!showPreviewTable)}
                          className="gap-1.5 cursor-pointer hover:bg-muted"
                        >
                          {showPreviewTable ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Ver datos
                            </>
                          )}
                        </Button>
                      </div>

                      {parsedData.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Errores detectados</AlertTitle>
                          <AlertDescription className="text-xs">
                            {parsedData.errors.slice(0, 3).join(' • ')}
                            {parsedData.errors.length > 3 && ` (+${parsedData.errors.length - 3} más)`}
                          </AlertDescription>
                        </Alert>
                      )}

                      {showPreviewTable && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Teléfono</TableHead>
                                {parsedData.headers.map((h) => (
                                  <TableHead key={h} className="capitalize">{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedData.recipients.slice(0, 5).map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                  <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                                  {parsedData.headers.map((h) => (
                                    <TableCell key={h}>{r.variables[h] || '-'}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {parsedData.recipients.length > 5 && (
                            <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/30">
                              +{parsedData.recipients.length - 5} contactos más
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card de Mensaje */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-info/10">
                      <Sparkles className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Mensaje</CardTitle>
                      <CardDescription>
                        Haz clic en las variables para insertarlas en el mensaje
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Variables disponibles */}
                  {availableVariables.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Variable className="h-4 w-4 text-primary" />
                        Variables disponibles
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {availableVariables.map((variable) => {
                          const isUsed = usedVariables.includes(variable);
                          return (
                            <Button
                              key={variable}
                              variant={isUsed ? 'default' : 'outline'}
                              size="sm"
                              className="h-8 text-xs gap-1.5 cursor-pointer"
                              onClick={() => insertVariable(variable)}
                            >
                              {`{${variable}}`}
                              {isUsed && <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Textarea del mensaje */}
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">Contenido del Mensaje</Label>
                    <Textarea
                      ref={messageTextareaRef}
                      id="message"
                      placeholder="Escribe tu mensaje aquí...

Ejemplo: Hola {nombre}, tu código es {codigo}."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={7}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{message.length} caracteres</span>
                      <div className="flex items-center gap-2">
                        {missingVariables.length > 0 && (
                          <Badge variant="destructive" className="gap-1.5 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Variables faltantes: {missingVariables.join(', ')}
                          </Badge>
                        )}
                        {usedVariables.length > 0 && missingVariables.length === 0 && (
                          <Badge variant="outline" className="gap-1.5 text-xs">
                            <Sparkles className="h-3 w-3" />
                            {usedVariables.length} variables
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview del mensaje */}
                  {message && parsedData.recipients.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Eye className="h-3.5 w-3.5" />
                        Vista previa (primer contacto)
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewMessage}</p>
                    </div>
                  )}

                  {/* Imagen */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Imagen (opcional)
                      </Label>
                      <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as any)} className="w-auto">
                        <TabsList className="h-9">
                          <TabsTrigger value="url" className="text-xs h-7 px-3 cursor-pointer">
                            <LinkIcon className="h-3 w-3 mr-1.5" />
                            URL
                          </TabsTrigger>
                          <TabsTrigger value="upload" className="text-xs h-7 px-3 cursor-pointer">
                            <Upload className="h-3 w-3 mr-1.5" />
                            Subir
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {imageMode === 'url' ? (
                      <Input
                        type="url"
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="h-10"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Label 
                          htmlFor="image-upload" 
                          className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          {isUploadingImage ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Subiendo imagen...
                            </div>
                          ) : imageFile ? (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                              {imageFile.name}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Seleccionar archivo</span>
                            </div>
                          )}
                        </Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </div>
                    )}

                    {imageUrl && (
                      <div className="relative border rounded-lg p-3 bg-muted/30 group">
                        <Image
                          src={imageUrl}
                          alt="Preview"
                          width={400}
                          height={160}
                          className="max-h-40 w-auto mx-auto rounded"
                          unoptimized
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => {
                            setImageUrl('');
                            setImageFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card de Configuración */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-warning/10">
                      <Users className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Configuración</CardTitle>
                      <CardDescription>
                        Envío secuencial con delay para evitar bloqueos
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
                    <div className="h-2 w-2 rounded-full bg-success mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Bot WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        Envío secuencial con delay de 5 segundos entre mensajes para
                        evitar bloqueos del número.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  onClick={handleValidate}
                  disabled={isValidating || isSending || parsedData.recipients.length === 0 || !message}
                  variant="outline"
                  className="flex-1 h-11 cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Validar ({parsedData.recipients.length})
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSend}
                  disabled={!validationResult || isValidating || isSending}
                  className="flex-1 h-11 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Mensajes
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleClear} 
                      variant="ghost" 
                      size="icon" 
                      className="h-11 w-11 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar todo</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Panel Lateral */}
            <div className="space-y-6">
              {/* Vista Previa de Validación */}
              {validationResult && !sendResult && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Listo para enviar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Destinatarios</span>
                        </div>
                        <Badge variant="secondary" className="text-sm">{validationResult.total}</Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Tiempo estimado</span>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          ~{validationResult.estimatedTimeMinutes} min
                        </Badge>
                      </div>

                      {imageUrl && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2.5">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Con imagen</span>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </div>
                      )}

                      {validationResult.variablesUsed?.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2.5">
                            <Variable className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Variables</span>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {validationResult.variablesUsed.length}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-4 bg-background space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Ejemplo de mensaje
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {validationResult.recipients[0]?.message}
                      </p>
                    </div>

                    <Alert className="border-info bg-info-soft">
                      <Info className="h-4 w-4 text-info" />
                      <AlertDescription className="text-xs text-info">
                        Revisa el mensaje y haz clic en &quot;Enviar Mensajes&quot;
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* Resultados */}
              {sendResult && (
                <Card className="border-success">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Resultados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">
                          {sendResult.summary.successful}/{sendResult.summary.total}
                        </span>
                      </div>
                      <Progress value={parseFloat(sendResult.summary.successRate)} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground pt-1">
                        {sendResult.summary.successRate}% de éxito
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-lg p-4 space-y-1 bg-success-soft border-success">
                        <p className="text-2xl font-bold text-success">
                          {sendResult.summary.successful}
                        </p>
                        <p className="text-xs text-muted-foreground">Exitosos</p>
                      </div>

                      <div className="border rounded-lg p-4 space-y-1 bg-danger-soft border-destructive">
                        <p className="text-2xl font-bold text-destructive">
                          {sendResult.summary.failed}
                        </p>
                        <p className="text-xs text-muted-foreground">Fallidos</p>
                      </div>
                    </div>

                    {sendResult.summary.withImage !== undefined && (
                      <div className="text-xs text-muted-foreground text-center py-2 border-t">
                        📷 {sendResult.summary.withImage} con imagen • 📝 {sendResult.summary.textOnly} solo texto
                      </div>
                    )}

                    {sendResult.summary.failed > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Algunos fallaron</AlertTitle>
                        <AlertDescription className="text-xs">
                          {sendResult.summary.failed} mensajes no enviados
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      onClick={handleClear} 
                      variant="outline" 
                      className="w-full h-10 cursor-pointer"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Nuevo Envío
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Ayuda */}
              {!validationResult && !sendResult && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="space-y-4">
                        <p className="text-sm font-medium">Cómo usar variables</p>
                        <div className="text-xs text-muted-foreground space-y-2.5">
                          <p>
                            <strong>1.</strong> Agrega datos con columnas (CSV o pegando)
                          </p>
                          <p>
                            <strong>2.</strong> Los headers se convierten en variables
                          </p>
                          <p>
                            <strong>3.</strong> Usa {'{variable}'} en el mensaje
                          </p>
                        </div>
                        
                        <div className="border rounded-lg p-3 bg-muted/30 font-mono text-xs">
                          telefono,nombre,empresa<br/>
                          595...,Juan,Acme Inc
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Mensaje: &quot;Hola {'{nombre}'} de {'{empresa}'}&quot;
                        </p>

                        <ul className="text-xs text-muted-foreground space-y-1.5 mt-4 pt-4 border-t">
                          <li>• Máximo 100 destinatarios</li>
                          <li>• Delay de 5s entre mensajes</li>
                          <li>• Envío secuencial personalizado</li>
                          <li>• {'{nombre}'} siempre disponible</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}