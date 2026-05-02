import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Mail, Lock, LogOut, Save, Check, AlertCircle, Eye, EyeOff, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { isLoggedIn, logout, getCurrentUser, updateName, updatePassword, updateEmail, getInitials } from '../lib/appwrite';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Name form
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Email form
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Logout
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const auth = await isLoggedIn();
      if (!auth) {
        navigate('/login');
        return;
      }
      const result = await getCurrentUser();
      if (result.success && result.user) {
        setUser(result.user);
        setName(result.user.name);
        setEmail(result.user.email);
      }
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    setNameSuccess('');
    setNameError('');
    try {
      const result = await updateName(name);
      if (result.success) {
        setUser(result.user);
        setNameSuccess('Name updated successfully');
      } else {
        setNameError(result.error || 'Failed to update name');
      }
    } catch {
      setNameError('Failed to update name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      const result = await updateEmail(email, emailPassword);
      if (result.success) {
        setUser(result.user);
        setEmailSuccess('Email updated successfully');
        setEmailPassword('');
      } else {
        setEmailError(result.error || 'Failed to update email');
      }
    } catch {
      setEmailError('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordLoading(false);
      return;
    }

    try {
      const result = await updatePassword(newPassword, oldPassword);
      if (result.success) {
        setPasswordSuccess('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(result.error || 'Failed to update password');
      }
    } catch {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      navigate('/');
    } catch {
      setLogoutLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-600">Loading...</p>
      </motion.div>
    </div>
  );

  const initials = getInitials(user?.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-white/80 backdrop-blur sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">SecurePrint</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <CardContent className="p-6 -mt-12">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white text-white text-2xl font-bold">
                  {initials}
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-slate-900">{user?.name || 'User'}</h2>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateName} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-11"
                    />
                  </div>
                  <AnimatePresence>
                    {nameError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {nameError}
                      </motion.div>
                    )}
                    {nameSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-emerald-600">
                        <Check className="w-4 h-4" />
                        {nameSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" disabled={nameLoading || name === user?.name} className="h-10">
                    {nameLoading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                    ) : (
                      <><Save className="mr-2 w-4 h-4" />Save Name</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Email Update */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Email Address</CardTitle>
                    <CardDescription>Change your email (requires current password)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">New Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">Current Password</Label>
                    <Input
                      id="emailPassword"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11"
                      required
                    />
                  </div>
                  <AnimatePresence>
                    {emailError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {emailError}
                      </motion.div>
                    )}
                    {emailSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-emerald-600">
                        <Check className="w-4 h-4" />
                        {emailSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" disabled={emailLoading || !emailPassword || email === user?.email} className="h-10">
                    {emailLoading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                    ) : (
                      <><Save className="mr-2 w-4 h-4" />Update Email</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Password Update */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Change Password</CardTitle>
                    <CardDescription>Update your password for account security</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="flex gap-1 mt-1">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              newPassword.length >= (i + 1) * 3
                                ? i < 1 ? 'bg-red-400' : i < 2 ? 'bg-amber-400' : i < 3 ? 'bg-blue-400' : 'bg-emerald-400'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`h-11 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : confirmPassword && confirmPassword === newPassword ? 'border-emerald-300' : ''}`}
                      required
                    />
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>
                  <AnimatePresence>
                    {passwordError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {passwordError}
                      </motion.div>
                    )}
                    {passwordSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-sm text-emerald-600">
                        <Check className="w-4 h-4" />
                        {passwordSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="h-10">
                    {passwordLoading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                    ) : (
                      <><Lock className="mr-2 w-4 h-4" />Update Password</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Account Security</CardTitle>
                    <CardDescription>Your account protection status</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">Email Verified</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${user?.emailVerification ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {user?.emailVerification ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Member Since</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {user?.$createdAt ? new Date(user.$createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Session Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                    <LogOut className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-slate-900">Session Management</CardTitle>
                    <CardDescription className="text-slate-600">Control your active session</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Info */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Current Session</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Device</span>
                      <span className="text-slate-600">Web Browser</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location</span>
                      <span className="text-slate-600">Current Device</span>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 mb-1">Before you sign out</h4>
                      <ul className="text-xs text-amber-800 space-y-1">
                        <li>• Make sure you've saved all important work</li>
                        <li>• Any unsaved uploads will be lost</li>
                        <li>• You'll need to sign in again to access your files</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-50"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back to Home
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? (
                      <><div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin mr-2" />Signing out...</>
                    ) : (
                      <><LogOut className="mr-2 w-4 h-4" />Sign Out</>
                    )}
                  </Button>
                </div>

                {/* Alternative Options */}
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 text-center mb-3">Need to switch accounts?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => navigate('/login')}
                    >
                      Switch Account
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => window.open('mailto:support@secureprint.com')}
                    >
                      Get Help
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
