import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Download, FileKey, Check, AlertCircle, Clock, FileText, Image, LogOut, Archive, HardDrive, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import confetti from 'canvas-confetti';

import { retrieveFile, validateOTC } from '../lib/api';
import { isLoggedIn, logout, getCurrentUser, getInitials } from '../lib/appwrite';

interface FileInfo {
  fileNames: string[];
  totalFiles: number;
  totalSize: number;
  isBatch: boolean;
  expiresAt: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
  const [userInitials, setUserInitials] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    let interval: number | undefined;
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
      if (status) {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUserInitials(getInitials(result.user.name));
        }
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleValidate = async () => {
    if (otc.length !== 6) {
      setError('OTC must be 6 alphanumeric characters');
      return;
    }

    setValidating(true);
    setError('');

    try {
    const result = (await validateOTC(otc)) as {
      valid: boolean;
      fileNames?: string[];
      totalFiles?: number;
      totalSize?: number;
      isBatch?: boolean;
      expiresAt?: string;
      error?: string;
    };
    
    if (result.valid) {
      setFileInfo({
        fileNames: result.fileNames || [],
        totalFiles: result.totalFiles || 1,
        totalSize: result.totalSize || 0,
        isBatch: !!result.isBatch,
        expiresAt: result.expiresAt || ''
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
    const result = await retrieveFile(otc, '') as any;
    if (result.success && result.file) {
      const url = URL.createObjectURL(result.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || 'file';
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      
      // Celebration confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
      });
    } else {
      setError(result.error || 'Download failed');
    }
    } catch (err) {
      setError('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otc.length === 6 && !validating) {
      handleValidate();
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

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-600">Loading...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-white/80 backdrop-blur top-0 sticky z-50"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center"
              >
                <Shield className="w-5 h-5 text-white" />
              </motion.div>
              SecurePrint
            </Link>
            {isAuthenticated && (
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow-md transition-shadow">
                  {userInitials || 'U'}
                </div>
              </Link>
            )}
          </div>
        </div>
      </motion.header>

      <main className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-500 rounded-3xl mx-auto mb-8 shadow-2xl flex items-center justify-center ring-4 ring-indigo-100/50"
              >
                <Download className="w-12 h-12 text-white drop-shadow-lg" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                  Retrieve Files
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Enter your OTC code to access files
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="otc" className="text-sm font-medium">OTC Code</Label>
                <Input
                  id="otc"
                  value={otc}
                  onChange={(e) => setOtc(e.target.value.replace(/[^A-Z0-9]/gi, '').slice(0,6))}
                  onKeyDown={handleKeyDown}
                  placeholder="A1B2C3"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest mt-2 h-14 border-2 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1 text-center">6 alphanumeric characters • Press Enter to validate</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  onClick={handleValidate}
                  className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  disabled={validating || otc.length !== 6}
                >
                  {validating ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 w-4 h-4" />
                      Validate OTC
                    </>
                  )}
                </Button>
              </motion.div>

              <AnimatePresence>
                {fileInfo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl"
                  >
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Check className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-emerald-800">Valid OTC!</h3>
                        <p className="text-emerald-700 text-sm">
                          {fileInfo.totalFiles === 1 ? '1 file ready' : `${fileInfo.totalFiles} files ready`}
                        </p>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-3">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm"
                      >
                        {fileInfo.isBatch ? (
                          <Archive className="w-5 h-5 text-blue-600" />
                        ) : (
                          getFileIcon(fileInfo.fileNames[0] || 'file')
                        )}
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {fileInfo.fileNames[0] || 'File'}
                        </span>
                      </motion.div>
                      {fileInfo.totalFiles > 1 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm"
                        >
                          <FileText className="w-5 h-5 text-slate-600" />
                          <span className="text-sm text-slate-600">+{fileInfo.totalFiles - 1} more</span>
                        </motion.div>
                      )}
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm"
                    >
                      <HardDrive className="w-5 h-5 text-slate-600" />
                      <span className="text-sm text-slate-700">{formatFileSize(fileInfo.totalSize)}</span>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">Expires in</span>
                      </div>
                      <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {formatTimeLeft(timeLeft)}
                      </span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button 
                        onClick={handleDownload}
                        className="w-full h-14 font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl text-white transition-all"
                        disabled={loading || timeLeft <= 0}
                      >
                        {loading ? (
                          <>
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                            />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 w-5 h-5" />
                            {fileInfo.isBatch ? 'Download ZIP Archive' : 'Download File'}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {downloaded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                    >
                      <Check className="w-20 h-20 text-emerald-600 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-emerald-800 mb-2">Download Complete!</h3>
                    <p className="text-emerald-700 mb-6">This OTC has been used and is now invalid.</p>
                    <Button 
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg transition-all"
                      variant="default"
                      onClick={() => navigate('/')}
                    >
                      Back to Home
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <AnimatePresence>
            {fileInfo && !downloaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8 text-sm text-slate-600 text-center max-w-md mx-auto p-4 bg-white/50 backdrop-blur rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">Secure & Ephemeral</span>
                </div>
                <p className="text-xs text-slate-500">This OTC will self-destruct after use or expiry. Files are automatically deleted from storage.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

export default RetrievePage;

