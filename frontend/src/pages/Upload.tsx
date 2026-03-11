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
  status: 'pending' | 'uploading' | 'success' | 'error';
  otc?: string;
  error?: string;
}

interface UploadResult {
  success: boolean;
  otc?: string;
  fileId?: string;
  error?: string;
}

function UploadPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [copied, setCopied] = useState(false);

  const MAX_FILES = 5;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await isLoggedIn();
        setIsAuthenticated(status);
        if (!status) {
          navigate('/login');
        }
      } catch (error) {
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

  // Allowed MIME types (must match backend)
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  const getTotalSize = (fileList: FileWithProgress[]) => {
    return fileList.reduce((total, file) => total + file.size, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles: FileWithProgress[] = [];
      
      for (const file of selectedFiles) {
        // Check if already at max files
        if (files.length + newFiles.length >= MAX_FILES) {
          alert(`Maximum ${MAX_FILES} files allowed`);
          break;
        }
        
        // Check file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          alert(`Invalid file type: ${file.name}. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, PPTX`);
          continue;
        }
        
        // Check individual file size (max 50MB per file for now, will check total below)
        if (file.size > 50 * 1024 * 1024) {
          alert(`File too large: ${file.name}. Maximum size is 50MB`);
          continue;
        }
        
        // Check total size
        const currentTotal = getTotalSize(files);
        if (currentTotal + file.size > MAX_TOTAL_SIZE) {
          alert(`Total size would exceed 50MB limit. Current: ${(currentTotal / 1024 / 1024).toFixed(2)}MB`);
          break;
        }
        
        // Add file with extra properties
        newFiles.push(Object.assign(file, {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          progress: 0,
          status: 'pending' as const
        }));
      }
      
      setFiles(prev => [...prev, ...newFiles]);
      setUploadResults([]);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    setUploadResults([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadResults([]);
    
    // Set all files to uploading status
    setFiles(files.map(f => ({ ...f, progress: 0, status: 'uploading' as const })));

    try {
      const { uploadFiles } = await import('../lib/api');
      
      // Convert FileWithProgress to regular File array
      // Use slice() to create a new Blob from the original file, then create a new File
      const plainFiles = files.map(f => {
        // Get the underlying blob from the file and create a new File
        const blob = f.slice(0, f.size, f.type);
        const plainFile = new File([blob], f.name, { type: f.type });
        return plainFile;
      });
      
      // Upload with progress tracking
      const result = await uploadFiles(
        plainFiles,
        'authenticated_user',
        (fileIndex: number, progress: number) => {
          // Use functional update to avoid stale state issues
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { ...f, progress } : f
          ));
        }
      ) as { success: boolean; results: UploadResult[] };
      
      // Ensure result has expected structure
      if (!result || !result.results) {
        throw new Error('Invalid response from server');
      }
      
      // Update file statuses - handle case where results might not match files length
      setFiles(prev => prev.map((f, idx) => {
        const fileResult = result.results[idx];
        if (!fileResult) {
          return { ...f, status: 'error' as const, error: 'No result returned for file' };
        }
        return {
          ...f,
          status: fileResult.success ? 'success' as const : 'error' as const,
          otc: fileResult.otc,
          error: fileResult.error,
          progress: 100
        };
      }));
      
      setUploadResults(result.results);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      // Update all files to error state
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: errorMessage })));
      setUploadResults([{ success: false, error: errorMessage }]);
    } finally {
      setUploading(false);
    }
  };

  const copyOTC = (otc: string) => {
    navigator.clipboard.writeText(otc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const totalSize = getTotalSize(files);
  const allUploaded = files.length > 0 && files.every(f => f.status === 'success');
  const hasErrors = files.some(f => f.status === 'error');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Shield className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 font-poppins">SecurePrint</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Upload Files</CardTitle>
            <CardDescription>
              Upload up to 5 files (max 50MB total). Each file gets a one-time access code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Stats */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Files: {files.length} / {MAX_FILES}</span>
              <span>Total: {formatFileSize(totalSize)} / {formatFileSize(MAX_TOTAL_SIZE)}</span>
            </div>

            {/* Progress Bar for Total */}
            {(uploading || allUploaded) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {uploading ? 'Uploading...' : allUploaded ? 'Upload Complete!' : 'Processing...'}
                  </span>
                  <span className="text-muted-foreground">
                    {files.filter(f => f.status === 'success').length} / {files.length} files
                  </span>
                </div>
                <Progress value={(files.filter(f => f.status === 'success').length / files.length) * 100} />
              </div>
            )}

            {/* File Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="font-medium text-slate-900">Click to select files</p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOC, DOCX, TXT, PNG, JPG, PPTX up to 50MB total
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div 
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      file.status === 'success' ? 'bg-green-50 border-green-200' :
                      file.status === 'error' ? 'bg-red-50 border-red-200' :
                      file.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    {getFileIcon(file.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.status === 'uploading' && (
                          <span className="text-blue-600">{file.progress}%</span>
                        )}
                        {file.status === 'success' && file.otc && (
                          <span className="text-green-600 font-medium">OTC: {file.otc}</span>
                        )}
                        {file.status === 'error' && (
                          <span className="text-red-600">{file.error}</span>
                        )}
                      </div>
                      
                      {/* Individual Progress Bar */}
                      {(file.status === 'uploading' || file.status === 'success') && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                    </div>

                    {/* Status Icon */}
                    {file.status === 'success' && (
                      <div className="flex items-center gap-1">
                        <Check className="w-5 h-5 text-green-600" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => file.otc && copyOTC(file.otc)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {file.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    
                    {/* Remove Button */}
                    {!uploading && file.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || allUploaded}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Uploading {files.length} file(s)...
                </>
              ) : allUploaded ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  All Files Uploaded
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''} Securely
                </>
              )}
            </Button>

            {/* Upload More Button */}
            {allUploaded && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setFiles([]);
                  setUploadResults([]);
                }}
              >
                Upload More Files
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default UploadPage;

