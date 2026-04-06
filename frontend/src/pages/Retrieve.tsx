import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Download, FileKey, Check, AlertCircle, Clock, Lock, Zap, Users, FileText, Image } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';

import { retrieveFile, validateOTC } from '../lib/api';
import { isLoggedIn, logout } from '../lib/appwrite';

interface FileInfo {
  fileNames: string[];
  totalFiles: number;
  totalSize: number;
  isBatch: boolean;
  expiresAt: string;
}

function RetrievePage() {
  const [otc, setOtc] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (fileInfo?.expiresAt) {
      interval = setInterval(() => {
        const expiryTime = new Date(fileInfo.expiresAt).getTime();
        const now = Date.now();
        const left = Math.max(0, (expiryTime - now) / 1000);
        setTimeLeft(left);
        if (left <= 0) {
          setError('OTC expired');
          setFileInfo(null);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fileInfo]);

  const checkAuth = async () => {
    try {
      const status = await isLoggedIn();
      setIsAuthenticated(status);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleValidate = async () => {
    if (otc.length !== 6) {
      setError('OTC must be 6 digits');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const result = await validateOTC(otc);
      
      if (result.valid) {
        setFileInfo({
          fileNames: result.fileNames || [],
          totalFiles: result.totalFiles || 1,
          totalSize: result.totalSize || 0,
          isBatch: !!result.isBatch,
          expiresAt: result.expiresAt
        });
        setTimeLeft(600); // 10 min initial
      } else {
        setError(result.error || 'Invalid OTC');
        setFileInfo(null);
      }
    } catch (err) {
      setError('Validation failed');
      setFileInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const result = await retrieveFile(otc, '');
      if (result.success && result.file) {
        const url = URL.createObjectURL(result.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName || 'file';
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
      } else {
        setError(result.error || 'Download failed');
      }
    } catch (err) {
      setError('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().match(/\.(pdf|doc|docx)$/)) return <FileText className="w-6 h-6 text-blue-600" />;
    if (name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) return <Image className="w-6 h-6 text-green-600" />;
    return <FileText className="w-6 h-6 text-blue-600" />;
  };

  if (authLoading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <header className="max-w-md mx-auto mb-8 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">SecurePrint</span>
        </Link>
        {isAuthenticated && (
          <Button variant="outline" size="sm" onClick={async () => {
            await logout();
            setIsAuthenticated(false);
          }}>
            Logout
          </Button>
        )}
      </header>

      <main className="max-w-md mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Download className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Retrieve Files</CardTitle>
            <CardDescription>Enter your OTC code to access files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="otc">OTC Code (6 digits)</Label>
              <Input
                id="otc"
                value={otc}
                onChange={(e) => setOtc(e.target.value.replace(/\D/g, '').slice(0,6))}
                placeholder="123456"
                maxLength={6}
                className="text-center text-xl font-mono tracking-wider mt-2"
              />
            </div>

            <Button 
              onClick={handleValidate}
              className="w-full"
              disabled={validating || otc.length !== 6}
              variant={otc.length === 6 ? "default" : "outline"}
            >
              {validating ? "Checking..." : "Validate OTC"}
            </Button>

            {fileInfo && (
              <div className="space-y-4 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-emerald-800">Valid OTC!</h3>
                    <p className="text-emerald-700 text-sm">
                      {fileInfo.totalFiles === 1 ? '1 file ready' : `${fileInfo.totalFiles} files`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <FileKey className="w-4 h-4 text-slate-600" />
                    <span>{fileInfo.fileNames[0] || 'File'}</span>
                  </div>
                  {fileInfo.totalFiles > 1 && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                      <span className="text-slate-600">+{fileInfo.totalFiles - 1} more</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border">
                  <span className="text-sm font-medium text-slate-700">Expires</span>
                  <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {formatTimeLeft(timeLeft)}
                  </span>
                </div>

                <Button 
                  onClick={handleDownload}
                  className="w-full shadow-lg hover:shadow-xl"
                  disabled={loading || timeLeft <= 0}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    fileInfo.isBatch ? 'Download ZIP' : 'Download File'
                  )}
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {downloaded && (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center">
                <Check className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">Downloaded!</h3>
                <p className="text-emerald-700">This OTC is now invalid.</p>
                <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
                  Back to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {fileInfo && (
          <div className="mt-8 text-xs text-slate-500 text-center max-w-md mx-auto">
            <p>This OTC will self-destruct after use or expiry. Files are deleted automatically.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default RetrievePage;

