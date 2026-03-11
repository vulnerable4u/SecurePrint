
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Download, FileKey, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { retrieveFile, validateOTC } from '../lib/api';

function RetrievePage() {
  const [otc, setOtc] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState<{
    fileName: string;
    fileSize: string;
    mimeType: string;
  } | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleValidate = async () => {
    if (!otc) {
      setError('Please enter the OTC code');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const result = await validateOTC(otc);
      
      if (result.valid) {
        setFileInfo({
          fileName: result.fileName || 'Unknown',
          fileSize: result.fileSize ? `${(result.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
          mimeType: result.mimeType || 'application/octet-stream'
        });
      } else if (result.alreadyUsed) {
        setError('This OTC code has already been used');
        setFileInfo(null);
      } else {
        setError('Invalid OTC code');
        setFileInfo(null);
      }
    } catch (err) {
      setError('Failed to validate OTC code');
      setFileInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleDownload = async () => {
    if (!otc) {
      setError('Please enter the OTC code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await retrieveFile(otc, '');
      
      if (result.success && result.file) {
        // Create download link
        const url = URL.createObjectURL(result.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName || 'downloaded-file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setDownloaded(true);
      } else {
        setError(result.error || 'Failed to download file');
      }
    } catch (err) {
      setError('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 font-poppins">SecurePrint</span>
            </Link>
            
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Download className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Retrieve File</CardTitle>
            <CardDescription>
              Enter the OTC code to download your file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTC Input */}
            <div className="space-y-2">
              <Label htmlFor="otc">One-Time Code (OTC)</Label>
              <div className="relative">
                <FileKey className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="otc"
                  type="text"
                  placeholder="Enter 6-digit OTC"
                  value={otc}
                  onChange={(e) => setOtc(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-10 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Validate Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleValidate}
              disabled={validating || otc.length !== 6}
            >
              {validating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Validate OTC
                </>
              )}
            </Button>

            {/* File Info */}
            {fileInfo && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileKey className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{fileInfo.fileName}</p>
                    <p className="text-sm text-blue-600">{fileInfo.fileSize}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            {fileInfo && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleDownload}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Downloading...
                  </>
                ) : downloaded ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Download Complete
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </>
                )}
              </Button>
            )}

            {downloaded && (
              <p className="text-center text-sm text-muted-foreground">
                File downloaded successfully. This OTC code is now invalidated.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default RetrievePage;

