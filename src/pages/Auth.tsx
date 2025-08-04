import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';

const Auth = () => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  // Check if user is coming from password reset email
  useEffect(() => {
    const checkForPasswordReset = async () => {
      try {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const type = urlParams.get('type') || hashParams.get('type');
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        
        console.log('Password reset check:', { type, hasAccessToken: !!accessToken, url: window.location.href });
        
        if (type === 'recovery' && accessToken) {
          console.log('Password reset detected');
          
          // Verify the session first
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Invalid reset link. Please request a new password reset.');
            return;
          }
          
          if (!session?.user) {
            setError('Invalid reset link. Please request a new password reset.');
            return;
          }
          
          setIsResetPassword(true);
          setEmail(session.user.email || '');
        }
      } catch (err) {
        console.error('Password reset check error:', err);
        setError('Error processing reset link. Please try again.');
      }
    };

    checkForPasswordReset();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError(t('auth.messages.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      // Check if user is admin and redirect appropriately
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate(profile?.is_admin ? '/admin' : '/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      if (isForgotPassword) {
        result = await resetPassword(email);
        if (!result.error) {
          setSuccess('Password reset email sent! Please check your email for instructions.');
        }
      } else if (isSignUp) {
        result = await signUp(email, password, fullName);
        if (!result.error) {
          setSuccess('Account created! Please check your email to verify your account.');
        }
      } else {
        result = await signIn(email, password);
        if (!result.error) {
          navigate('/');
        }
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // If this is a password reset, show the reset form (don't wait for user from context)
  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <Shield className="h-8 w-8" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold">ARA PreRescue</span>
                </div>
              </Link>
              <LanguageSelector />
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>{t('auth.setNewPassword')}</CardTitle>
              <CardDescription>
                {t('auth.descriptions.setNewPassword')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? t('auth.updating') : t('auth.updatePassword')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Shield className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">ARA PreRescue</span>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Sign In')}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? 'Enter your email to receive password reset instructions'
                : (isSignUp 
                  ? 'Create your Personal Emergency Preparedness Record' 
                  : 'Access your emergency preparedness dashboard'
                )
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Please wait...' : (
                  isForgotPassword ? 'Send Reset Email' : (isSignUp ? 'Create Account' : 'Sign In')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {!isForgotPassword ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
                    disabled={loading}
                  >
                    {isSignUp 
                      ? 'Already have an account? Sign in' 
                      : "Don't have an account? Sign up"
                    }
                  </button>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      Forgot your password?
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsSignUp(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;