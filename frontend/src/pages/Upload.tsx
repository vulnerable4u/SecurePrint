import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Upload, FileKey, Copy, Check, AlertCircle, LogOut, X, FileText, Image } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { isLoggedIn, logout } from '../lib/appwrite';

interface FileWithProgress extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'ready' | 'success' | 'error';
  otc?: string;
  error?: string;
}

function UploadPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [otcGenerated, setOtcGenerated] = useState(false);
  const [otc, setOtc] = useState('');
  const [copied, setCopied] = useState(false);

  const MAX_FILES = 5;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await isLoggedIn();
        setIsAuthenticated(status);
        if (!status) navigate('/login');
      } catch {
        setIsAuthenticated(false);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    navigate('/');
  };

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  const getTotalSize = (fileList: FileWithProgress[]) => fileList.reduce((total, file) => total + file.size, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles: FileWithProgress[] = [];
      
      for (const file of selectedFiles) {
        if (files.length + newFiles.length >= MAX_FILES) {
          alert(`Maximum ${MAX_FILES} files`);
          break;
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          alert(`Invalid type: ${file.name}`);
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          alert(`Too large: ${file.name}`);
          continue;
        }
        const currentTotal = getTotalSize(files);
        if (currentTotal + file.size > MAX_TOTAL_SIZE) {
          alert('Total size exceeds 50MB');
          break;
        }
        newFiles.push(Object.assign(file, {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          progress: 0,
          status: 'pending' as const
        }));
      }
      setFiles(prev => [...prev, ...newFiles]);
      setOtcGenerated(false);
      setOtc('');
    }
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    setOtcGenerated(false);
    setOtc('');
  };

  const handleUpload = async () => {
    setUploading(true);
    setFiles(files.map(f => ({ ...f, progress: 0, status: 'uploading' as const })));

    try {
      const { uploadBatchFiles } = await import('../lib/api');
      const plainFiles = files.map(f => new File([f], f.name, { type: f.type }));
      const result = await uploadBatchFiles(
        plainFiles,
        'user',
        (progress: number) => setFiles(prev => prev.map(f => ({ ...f, progress } as FileWithProgress)))
      );

      if (result.success) {
        setFiles(prev => prev.map(f => ({ ...f, status: 'ready' as const, progress: 100 } as FileWithProgress)));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: msg } as FileWithProgress)));
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateOTC = async () => {
    const otcCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    setOtc(otcCode);
    setOtcGenerated(true);
    setFiles(prev => prev.map(f => ({ ...f, otc: otcCode } as FileWithProgress)));
  };

  const copyOTC = () => {
    navigator.clipboard.writeText(otc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type?: string) => {
    if (type?.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const filesReady = files.length > 0 && files.every(f => f.status === 'ready');
  const totalSize = getTotalSize(files);
  const hasErrors = files.some(f => f.status === 'error');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur top-0 sticky z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex gap-3 items-center p-3 rounded-lg hover:bg-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl hidden md:block">SecurePrint</span>
            </Link>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl mx-auto mb-6 shadow-xl flex items-center justify-center">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
              Secure File Upload
            </CardTitle>
            <CardDescription className="text-lg">
              Up to 5 files • 50MB total • OTC expires in 10 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{files.length}</div>
                  <div className="text-slate-500">of 5 files</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Image className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{formatFileSize(totalSize)}</div>
                  <div className="text-slate-500">50MB max</div>
                </div>
              </div>
            </div>

            {/* File Drop */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-all bg-slate-50 hover:bg-blue-50/50 group cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                multiple
              />
              <label htmlFor="file-upload">
                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
                <h3 className="text-xl font-bold text-slate-900 mb-1">Drop files here or click to browse</h3>
                <p className="text-slate-500 mb-4">PDF, DOC, images (max 50MB total)</p>
                <div className="text-xs text-slate-400">Up to 5 files</div>
              </label>
            </div>

            {/* Files list */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Selected files ({files.length})
                </h4>
                {files.map((file) => (
                  <div key={file.id} className="flex items-center p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all gap-4">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate pr-4">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <Progress value={file.progress} className="w-20 h-2" />
                        <span className="text-xs font-mono">{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {file.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeFile(file.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Main button - HIDDEN when filesReady */}
            {!filesReady && (
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold shadow-xl"
                onClick={handleUpload}
                disabled={!files.length || uploading}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-3" />
                    Uploading...
                  </>
                ) : (
                  'Start Upload'
                )}
              </Button>
            )}

            {/* Post-upload buttons - ONLY when filesReady */}
            {filesReady && (
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    // Reset to select new files, keep ready state but clear files list
                    setFiles([]);
                    setOtcGenerated(false);
                    setOtc('');
                  }}
                >
                  Upload More
                </Button>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-xl"
                  onClick={handleGenerateOTC}
                >
                  Generate OTC
                </Button>
              </div>
            )}

            {/* OTC display */}
            {otcGenerated && otc && (
              <Card className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-2xl">
                <CardContent className="p-8 text-center pt-8">
                  <FileKey className="w-16 h-16 mx-auto mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold mb-4">Your OTC Code</h3>
                  <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 mb-6">
                    <p className="text-4xl font-mono tracking-widest uppercase font-black">{otc}</p>
                  </div>
                  <p className="text-emerald-100 mb-6">Valid for 10 minutes. Share securely.</p>
                  <Button 
                    variant="secondary" 
                    size="lg"
                    className="w-full font-semibold"
                    onClick={copyOTC}
                  >
                    {copied ? 'Copied!' : 'Copy OTC'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasErrors && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-800">Upload failed. Check console.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default UploadPage;

