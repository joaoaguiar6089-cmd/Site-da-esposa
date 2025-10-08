import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export const StorageHealthCheck = () => {
  const [checking, setChecking] = useState(false);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkBucketHealth = async () => {
    setChecking(true);
    setError(null);

    try {
      // 1. Check if bucket exists by listing buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        setError(`Erro ao listar buckets: ${bucketsError.message}`);
        setBucketExists(false);
        setCanUpload(false);
        return;
      }

      const bucket = buckets?.find(b => b.name === 'client-documents');
      setBucketExists(!!bucket);

      if (!bucket) {
        setError('Bucket "client-documents" não encontrado. Execute o script SQL de configuração.');
        setCanUpload(false);
        return;
      }

      // 2. Check if can upload by creating a test file
      const testFileName = `test-${Date.now()}.txt`;
      const testFile = new Blob(['test'], { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(`test/${testFileName}`, testFile);

      if (uploadError) {
        setError(`Erro ao testar upload: ${uploadError.message}`);
        setCanUpload(false);
        return;
      }

      setCanUpload(true);

      // 3. Clean up test file
      await supabase.storage
        .from('client-documents')
        .remove([`test/${testFileName}`]);

    } catch (err) {
      console.error('Health check error:', err);
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBucketHealth();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Status do Storage</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={checkBucketHealth}
          disabled={checking}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando...' : 'Verificar'}
        </Button>
      </div>

      {checking ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verificando...</AlertTitle>
          <AlertDescription>
            Aguarde enquanto verificamos a configuração do storage.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {/* Bucket Exists Check */}
          <Alert variant={bucketExists ? "default" : "destructive"}>
            {bucketExists ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {bucketExists ? 'Bucket Encontrado' : 'Bucket Não Encontrado'}
            </AlertTitle>
            <AlertDescription>
              {bucketExists
                ? 'O bucket "client-documents" está configurado corretamente.'
                : 'O bucket "client-documents" não foi encontrado. Verifique a configuração.'}
            </AlertDescription>
          </Alert>

          {/* Upload Permission Check */}
          {bucketExists && (
            <Alert variant={canUpload ? "default" : "destructive"}>
              {canUpload ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {canUpload ? 'Upload Funcionando' : 'Erro no Upload'}
              </AlertTitle>
              <AlertDescription>
                {canUpload
                  ? 'O sistema pode fazer upload de arquivos com sucesso.'
                  : 'Não foi possível fazer upload de arquivos. Verifique as permissões.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Details */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro Detectado</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p>{error}</p>
                  <div className="text-sm mt-4">
                    <p className="font-semibold mb-2">Soluções:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Execute o script SQL disponível em <code className="bg-muted px-1 py-0.5 rounded">supabase-storage-setup.sql</code></li>
                      <li>Verifique se está autenticado no sistema</li>
                      <li>Confira as políticas RLS no painel do Supabase</li>
                      <li>Veja o arquivo <code className="bg-muted px-1 py-0.5 rounded">SETUP_STORAGE_BUCKET.md</code> para mais detalhes</li>
                    </ol>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {bucketExists && canUpload && !error && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Tudo Funcionando!</AlertTitle>
              <AlertDescription className="text-green-800">
                O sistema de anexos está configurado e funcionando corretamente.
                Você pode fazer upload de notas fiscais nas transações de entrada.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};
