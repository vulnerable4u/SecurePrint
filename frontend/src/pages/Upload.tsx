import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Upload, FileKey, Copy, Check, AlertCircle, LogOut, Trash2, FileText, Image, Download, Clock, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { isLoggedIn, logout, getCurrentUser, getInitials } from '../lib/appwrite';
import confetti from 'canvas-confetti';

interface FileWithProgress {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  otc?: string;
  error?: string;
}

type FileEvent = React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>;

const MAX_FILES = 5;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg'
];

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg', 'image/jpg']
};

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const isSupportedFile = (file: File): boolean => {
  // First check MIME type
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type)) {
    return true;
  }

  // Fallback to extension if MIME is undefined/empty
  if (!file.type || file.type === 'undefined' || file.type === '') {
    const ext = getFileExtension(file.name);
    return ext in ALLOWED_EXTENSIONS;
  }

  return false;
};

function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [otc, setOtc] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const controls = useAnimationControls();
  const [userInitials, setUserInitials] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await isLoggedIn();
        setIsAuthenticated(status);
        if (!status) navigate('/login');
        if (status) {
          const result = await getCurrentUser();
          if (result.success && result.user) {
            setUserInitials(getInitials(result.user.name));
          }
        }
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.file.size, 0), [files]);

  const getFileList = (e: FileEvent): FileList => {
    return 'dataTransfer' in e ? e.dataTransfer.files : (e.target as HTMLInputElement).files!;
  };

  const handleFileChange = useCallback((e: FileEvent) => {
    const fileList = getFileList(e);
    if (!fileList) return;

    const newFiles: FileWithProgress[] = Array.from(fileList).slice(0, MAX_FILES - files.length).map((file, idx) => ({
      file,
      id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substr(2)}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending' as const
    })).filter(fileWithProgress => {
      const file = fileWithProgress.file;
      if (!isSupportedFile(file)) {
        alert(`Unsupported type: ${file.name} (${file.type || 'unknown'})`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`File too large: ${file.name}`);
        return false;
      }
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        alert('Total size exceeds 50MB');
        return false;
      }
      return true;
    });

    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles]);
      setOtc('');
    }
  }, [totalSize, files.length]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setOtc('');
  };

  const handleUpload = async () => {
    console.log('🚀 Starting upload process...');
    setUploading(true);
    controls.start('uploadShake');

    try {
      console.log('📁 Files to upload:', files.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type })));
      
      const { uploadBatchFiles } = await import('../lib/api');
      const fileArray = files.map(f => f.file);
      
      console.log('📤 Calling uploadBatchFiles...');
      const result = await uploadBatchFiles(fileArray, 'anonymous', (progress: number) => {
        console.log('📊 Upload progress:', progress + '%');
        setFiles(prev => prev.map(f => ({ ...f, progress } as FileWithProgress)));
      });

      console.log('📥 Upload result:', result);

      if (result.success && result.otc) {
        console.log('✅ Upload successful, OTC:', result.otc);
        setOtc(result.otc);
        controls.start('successBounce');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const } as FileWithProgress)));
      } else {
        console.error('❌ Upload failed - no success or OTC in response:', result);
        const msg = (result as any).error || 'Upload failed - no OTC received';
        setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: msg } as FileWithProgress)));
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: msg } as FileWithProgress)));
    } finally {
      console.log('🏁 Upload process finished');
      setUploading(false);
    }
  };

  const copyOtc = () => {
    navigator.clipboard.writeText(otc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type?: string) => {
    if (type?.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type?.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />;
    if (type?.includes('word') || type?.includes('document')) return <FileText className="w-6 h-6 text-blue-400" />;
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filesReady = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'pending');
  const hasErrors = files.some(f => f.status === 'error');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-600">Loading...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header - Exact Home match */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                SecurePrint
              </span>
            </Link>
            <Link to="/profile" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow-md transition-shadow">
                {userInitials || 'U'}
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero - Reduced size to match Home */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div 
            animate={controls}
            variants={{
              uploadShake: { x: [0, -4, 4, 0] },
              successBounce: { scale: [1, 1.03, 1] }
            }}
            className="inline-flex w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 shadow-xl ring-4 ring-emerald-100/50"
          >
            <Upload className="w-10 h-10 text-white m-auto" />
          </motion.div>
          <motion.h1 
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-4"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            Secure{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Upload
            </span>
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Up to 5 files • 50MB total • 10min OTC
          </p>
        </motion.section>

        {/* Compact Stats - Smaller cards */}
        <motion.div 
          className="grid grid-cols-3 gap-4 mb-12 p-6 bg-slate-50/50 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center p-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="font-bold text-lg">{files.length}</div>
            <div className="text-xs text-slate-500">/5 files</div>
          </div>
          <div className="text-center p-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="font-bold text-lg">{formatSize(totalSize)}</div>
            <div className="text-xs text-slate-500">50MB max</div>
          </div>
          <div className="text-center p-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="font-bold text-lg">10min</div>
            <div className="text-xs text-slate-500">expires</div>
          </div>
        </motion.div>

        {/* Compact Drag Drop */}
        <motion.section 
          className="mb-12"
          initial={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          animate={{ scale: 1 }}
        >
          <Card className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-white/80 backdrop-blur hover:shadow-xl transition-all overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent ${dragActive ? 'opacity-100' : 'opacity-0' } transition-opacity`} />
            <CardContent className="p-8 lg:p-12 text-center relative z-10">
              <input type="file" multiple onChange={handleFileChange} className="hidden" id="upload-drop" />
              <label htmlFor="upload-drop" className="block cursor-pointer">
                <motion.div animate={dragActive ? { scale: 1.05, rotate: [0, 5, -5, 0] } : {}} className="mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                    <Upload className="w-8 h-8" />
                  </div>
                </motion.div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Drop files or click to browse</h3>
                <p className="text-slate-500 mb-6">PDF, DOC, images (max 50MB total)</p>
              </label>
            </CardContent>
          </Card>
        </motion.section>

        {/* File Grid */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.section className="mb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-lg font-semibold text-slate-900 mb-6 text-center">
                Files
              </h3>
              <div className="space-y-3">
                {files.map((file, idx) => {
                  const ext = getFileExtension(file.file.name);
                  const isImage = file.file.type?.startsWith('image/');
                  const typeColor = ext === 'pdf' ? 'from-red-500 to-red-600' : ext === 'doc' || ext === 'docx' ? 'from-blue-500 to-blue-600' : ext === 'txt' ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600';

                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      layout
                      className="group"
                    >
                      <div className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        file.status === 'success'
                          ? 'bg-emerald-50/60 border-emerald-200 shadow-sm'
                          : file.status === 'error'
                          ? 'bg-red-50/60 border-red-200 shadow-sm'
                          : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                      }`}>
                        {/* Thumbnail / Icon */}
                        <div className="relative flex-shrink-0">
                          {isImage && file.preview && file.status !== 'success' ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden ring-1 ring-slate-200">
                              <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover" />
                            </div>
                          ) : file.status === 'success' ? (
                            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                              <Check className="w-7 h-7 text-white" />
                            </div>
                          ) : (
                            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${typeColor} flex items-center justify-center shadow-md`}>
                              <span className="text-white font-bold text-xs uppercase">{ext || '?'}</span>
                            </div>
                          )}
                          {file.status === 'uploading' && (
                            <div className="absolute inset-0 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-slate-800 truncate">{file.file.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{formatSize(file.file.size)}</span>
                            {file.status === 'uploading' && (
                              <>
                                <span className="text-xs text-blue-600 font-semibold">{file.progress}%</span>
                                <div className="flex-1">
                                  <Progress value={file.progress} className="h-1" />
                                </div>
                              </>
                            )}
                            {file.status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Ready</span>
                            )}
                            {file.status === 'success' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">Uploaded</span>
                            )}
                            {file.status === 'error' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">Failed</span>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        {file.status !== 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            onClick={() => removeFile(file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {!filesReady ? (
            <Button
              size="lg"
              className="w-full max-w-sm mx-auto h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white shadow-lg hover:shadow-xl"
              onClick={handleUpload}
              disabled={uploading || !files.length}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : 'Secure Upload'}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full max-w-sm mx-auto h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl"
              onClick={() => {
                setFiles([]);
                setOtc('');
                setCopied(false);
              }}
            >
              Upload Files
            </Button>
          )}
        </motion.div>

        {/* Compact OTC */}
        <AnimatePresence>
          {otc && (
            <motion.section 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-12 max-w-sm mx-auto"
            >
              <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl border-0">
                <CardContent className="p-6 text-center">
                  <FileKey className="w-10 h-10 mx-auto mb-3 opacity-90" />
                  <h3 className="text-lg font-semibold mb-3">Your OTC</h3>
                  <div className="bg-white/20 rounded-xl p-3 mb-4">
                    <div className="text-2xl font-mono uppercase font-bold tracking-widest">{otc}</div>
                  </div>
                  <Button size="sm" className="w-full" variant="secondary" onClick={copyOtc}>
                    {copied ? 'Copied ✓' : 'Copy Code'}
                  </Button>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {hasErrors && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1 text-sm">Upload failed</h4>
                <p className="text-sm text-red-800">Check file types/sizes. Try again.</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default UploadPage;

