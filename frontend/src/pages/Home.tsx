import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Printer, ArrowRight, FileKey, Users, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { login, isLoggedIn } from '../lib/appwrite';

function Home() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const status = await isLoggedIn();
      setIsAuthenticated(status);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Shield className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading SecurePrint...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'Your documents are encrypted before upload and can only be decrypted with the One-Time Access Code.',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      icon: FileKey,
      title: 'One-Time Access Codes',
      description: 'Generate unique OTC codes that allow single-use access. Once used, the file is permanently deleted.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      icon: Printer,
      title: 'Secure Printing',
      description: 'Recipients can securely view and print documents without saving or sharing them permanently.',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      icon: Users,
      title: 'No Account Required',
      description: 'Upload and share files anonymously. Optional accounts for managing your document history.',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Upload Your File',
      description: 'Drag and drop any document. It\'s encrypted client-side before upload.',
    },
    {
      step: 2,
      title: 'Get Your OTC',
      description: 'Receive a unique 6-digit One-Time Access Code to share with recipients.',
    },
    {
      step: 3,
      title: 'Share & Print',
      description: 'Recipient enters the code, decrypts, views, and prints the document once.',
    },
  ];

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
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="gradient" onClick={() => navigate('/upload')}>
                    Upload File
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fade-in">
              <Zap className="w-4 h-4" />
              Privacy-First Document Printing
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 font-poppins leading-tight mb-8 animate-slide-up">
              Secure Document Sharing with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                One-Time Access
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
              Upload documents privately, generate unique access codes, and let recipients securely view and print them once. Files are encrypted and permanently deleted after use.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button size="xl" variant="gradient" onClick={handleGetStarted} className="w-full sm:w-auto">
                Start Sharing Securely
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/how-it-works">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 font-poppins mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with privacy at its core. Every file is encrypted, every access is logged, and every session is secure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg card-hover">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-slate-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 font-poppins mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to securely share and print documents.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative text-center">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-indigo-200" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl font-bold rounded-2xl mb-6 shadow-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-3 text-lg">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white font-poppins mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start sharing documents securely today. No fees required for basic use.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="secondary" onClick={handleGetStarted} className="w-full sm:w-auto">
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white font-poppins">SecurePrint</span>
              </div>
              <p className="text-sm">
                Privacy-first document sharing with one-time access codes for secure printing.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} SecurePrint. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;

