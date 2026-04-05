
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Download, FileKey, Check, AlertCircle, Lock, Zap, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

import { retrieveFile, validateOTC } from '../lib/api';
import { isLoggedIn, logout } from '../lib/appwrite';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

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
    if (!otc) {
      setError('Please enter the OTC code');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const result = await validateOTC(otc) as any;
      
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
      const result = await retrieveFile(otc, '') as any;
      
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
      {/* Header - Match Home */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 font-poppins">SecurePrint</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="/#features" className="text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
                Features
              </a>
              <a href="/#how-it-works" className="text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
                How It Works
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
              ) : isAuthenticated ? (
                <>
                  <Button variant="gradient" onClick={() => navigate('/upload')}>
                    Upload File
                  </Button>
                  <Button variant="outline" onClick={async () => {
                    await logout();
                    setIsAuthenticated(false);
                    navigate('/');
                  }}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button variant="gradient" asChild>
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center pb-0">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-fade-in">
              <Download className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
            <div className="mx-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 backdrop-blur-sm text-blue-700 text-sm font-medium mb-6 animate-fade-in max-w-max shadow-lg border border-blue-200/50">
              <FileKey className="w-4 h-4" />
              One-Time Secure Access
            </div>
            <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent font-poppins mb-4 animate-slide-up">
              Retrieve Your File
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed animate-slide-up">
              Enter your 6-digit One-Time Code (OTC) to securely download the file. Valid once only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enhanced OTC Input */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="otc" className="text-lg font-medium">Enter One-Time Code</Label>
                <p className="text-sm text-muted-foreground">6-digit code shared with recipient</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl -z-10 animate-pulse" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <FileKey className="w-5 h-5 text-primary" />
                </div>
                <Input
                  id="otc"
                  type="text"
                  placeholder="123456"
                  value={otc}
                  onChange={(e) => setOtc(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-12 text-center text-3xl lg:text-4xl font-mono tracking-widest font-bold bg-gradient-to-r from-white via-slate-50 to-white shadow-xl border-2 border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl h-20 lg:h-24 py-6"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Validate Button */}
            <Button
              size="lg"
              className="w-full group relative overflow-hidden shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              onClick={handleValidate}
              disabled={validating || otc.length !== 6}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity" />
              {validating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3 relative z-10" />
                  <span className="font-medium relative z-10">Validating...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-3 relative z-10" />
                  <span className="font-bold relative z-10">Validate OTC</span>
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
                size="xl"
                className="w-full group relative overflow-hidden shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-2 transition-all duration-500 font-bold text-lg"
                onClick={handleDownload}
                disabled={loading}
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all" />
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mr-4 relative z-10" />
                    <span className="relative z-10 tracking-wide">Downloading File...</span>
                  </>
                ) : downloaded ? (
                  <>
                    <Check className="w-6 h-6 mr-4 relative z-10" />
                    <span className="relative z-10 tracking-wide">Download Complete ✓</span>
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6 mr-4 relative z-10" />
                    <span className="relative z-10 tracking-wide">Download Secure File</span>
                  </>
                )}
              </Button>
            )}

            {downloaded && (
              <p className="text-center text-sm text-muted-foreground animate-fade-in">
                File downloaded successfully. This OTC code is now invalidated.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Why Choose SecurePrint Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 text-center font-poppins mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Why Choose SecurePrint?</h3>
          <p className="text-center text-muted-foreground text-lg max-w-xl mx-auto mb-8">Enterprise-grade security for document sharing</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 hover:shadow-xl hover:shadow-blue-200/50 hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Lock className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <h4 className="font-semibold text-xl text-slate-900 mb-2 font-poppins">Zero Public Access</h4>
              <p className="text-muted-foreground leading-relaxed">Files stored privately in Backblaze B2 with no public URLs or sharing capabilities.</p>
            </div>
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <h4 className="font-semibold text-xl text-slate-900 mb-2 font-poppins">One-Time Only</h4>
              <p className="text-muted-foreground leading-relaxed">OTC codes validated server-side. File + code automatically deleted after single use.</p>
            </div>
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50 hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <h4 className="font-semibold text-xl text-slate-900 mb-2 font-poppins">No Account Required</h4>
              <p className="text-muted-foreground leading-relaxed">Anonymous upload/retrieve works perfectly. Optional accounts for history management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4 font-poppins">Need to Share a File?</h2>
          <p className="text-xl text-white/90 mb-8">Upload securely and generate a one-time code in seconds.</p>
          <Button size="xl" variant="secondary" onClick={() => navigate('/upload')} className="text-lg px-8">
            Upload Document
          </Button>
        </div>
      </section>

      {/* Footer - Match Home */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white font-poppins">SecurePrint</span>
              </div>
              <p>Privacy-first document sharing with one-time access codes.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="/#features" className="hover:text-white">Features</a></li>
                <li><a href="/#how-it-works" className="hover:text-white">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="/terms" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p>&copy; 2024 SecurePrint. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default RetrievePage;

