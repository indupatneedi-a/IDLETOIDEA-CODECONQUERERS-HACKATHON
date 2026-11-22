import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Phone,
  ArrowRight,
  Film,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { api } from '../services/api';
import { PendingIntent, User } from '../types';

interface LoginPageProps {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  pendingIntent: PendingIntent | null;
  onAuthComplete: (user: User) => void;
  onBrowseGuest: () => void;
  onSignOut: () => Promise<void>;
}

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before finishing.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Authentication Console. Use Google Sign-In or enable Email/Password in your Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few moments before trying again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export const LoginPage: React.FC<LoginPageProps> = ({
  firebaseUser,
  currentUser,
  pendingIntent,
  onAuthComplete,
  onBrowseGuest,
  onSignOut,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'requester' | 'owner'>('requester');
  const [organisationName, setOrganisationName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const intentMessage = () => {
    if (!pendingIntent) return null;
    if (pendingIntent.type === 'create-listing') {
      return 'Sign in with an Organization / Owner account to list equipment or workspaces.';
    }
    if (pendingIntent.type === 'request-booking') {
      return 'Sign in or create an account to request this booking. You will return to the listing automatically.';
    }
    if (pendingIntent.type === 'take-quiz') {
      return 'Sign in to take the safety readiness assessment and save your eligibility.';
    }
    return 'Sign in to continue.';
  };

  // If Firebase user is logged in via Email/Password but email isn't verified yet
  if (firebaseUser && !firebaseUser.emailVerified) {
    const handleResend = async () => {
      setLoading(true);
      setError(null);
      setInfoMessage(null);
      try {
        await sendEmailVerification(firebaseUser);
        setInfoMessage('Verification email sent. Please check your inbox and spam folder.');
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
    };

    const handleRefreshVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        await firebaseUser.reload();
        if (auth.currentUser?.emailVerified) {
          const profile = await api.ensureUserProfile(auth.currentUser);
          onAuthComplete(profile);
        } else {
          setError('Your email is still marked unverified. Click the link in your email first, then refresh.');
        }
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 text-left">
        <div className="w-full max-w-md rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#7A1F3D] text-[#F5F1F2] flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-[#F4A6C0]" />
            </div>
            <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">Verify Your Email</h1>
            <p className="text-sm text-[#B8AEB2]">
              We sent a verification link to <strong className="text-[#F5F1F2]">{firebaseUser.email}</strong>.
              Verify your email to submit bookings, take safety quizzes, or publish equipment.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#3FA776] text-[#3FA776] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleRefreshVerification}
              className="w-full py-3 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>I&apos;ve Verified — Continue</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleResend}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Resend Verification Email
            </button>

            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={onBrowseGuest}
                className="text-[#F4A6C0] hover:underline cursor-pointer"
              >
                Browse listings meanwhile
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="text-[#B8AEB2] hover:text-[#F5F1F2] inline-flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await api.ensureUserProfile(cred.user, {
        role: mode === 'signup' ? accountType : 'requester',
        organisationName: mode === 'signup' && accountType === 'owner' ? organisationName : undefined,
      });
      onAuthComplete(profile);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (accountType === 'owner' && !organisationName.trim()) {
        setError('Please enter your organization or studio name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = await api.ensureUserProfile(cred.user);
        if (cred.user.emailVerified) {
          onAuthComplete(profile);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        await api.ensureUserProfile(cred.user, {
          displayName: displayName.trim(),
          role: accountType,
          organisationName: accountType === 'owner' ? organisationName.trim() : undefined,
          phone: phone.trim() || undefined,
        });
        await sendEmailVerification(cred.user);
        setInfoMessage('Account created. A verification email has been sent to your inbox.');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 text-left">
      <div className="w-full max-w-md rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0D0D0F] border border-[#2C2A2F] text-xs font-mono-code text-[#F4A6C0]">
            <Film className="w-3.5 h-3.5" />
            <span>IDLETOIDEA ACCOUNT</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>

          <p className="text-xs text-[#B8AEB2] leading-relaxed">
            {intentMessage() ||
              'Sign in to book shared tools, complete safety readiness checks, or list your equipment.'}
          </p>
        </div>

        {currentUser && firebaseUser?.emailVerified && (
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#3FA776]/50 text-xs text-[#3FA776] flex items-center justify-between">
            <span>Signed in as {currentUser.displayName}</span>
            <button
              type="button"
              onClick={() => onAuthComplete(currentUser)}
              className="font-semibold underline cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex p-1 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                : 'text-[#B8AEB2] hover:text-[#F5F1F2]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                : 'text-[#B8AEB2] hover:text-[#F5F1F2]'
            }`}
          >
            Create account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#3FA776] text-[#3FA776] text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Google Sign-In */}
        <div className="space-y-3">
          {mode === 'signup' && (
            <div className="space-y-2 p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
              <label className="text-xs font-medium text-[#B8AEB2] block">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('requester')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    accountType === 'requester'
                      ? 'bg-[#7A1F3D] border-[#F4A6C0] text-[#F5F1F2]'
                      : 'bg-[#17171B] border-[#2C2A2F] text-[#B8AEB2] hover:text-[#F5F1F2]'
                  }`}
                >
                  <span className="font-semibold block">Maker / Member</span>
                  <span className="text-[11px] opacity-90">Browse &amp; book equipment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('owner')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    accountType === 'owner'
                      ? 'bg-[#7A1F3D] border-[#F4A6C0] text-[#F5F1F2]'
                      : 'bg-[#17171B] border-[#2C2A2F] text-[#B8AEB2] hover:text-[#F5F1F2]'
                  }`}
                >
                  <span className="font-semibold block">Organization / Owner</span>
                  <span className="text-[11px] opacity-90">List tools &amp; workspaces</span>
                </button>
              </div>
              {accountType === 'owner' && (
                <div className="pt-2">
                  <label htmlFor="org-name" className="text-xs text-[#B8AEB2] block mb-1">
                    Organization or workshop name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-[#B8AEB2]" />
                    <input
                      id="org-name"
                      type="text"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      placeholder="Your organization or makerspace"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2] placeholder-[#B8AEB2]/50 focus:border-[#F4A6C0] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0D0D0F] hover:bg-[#1E1E24] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.31 0 3.25 2.69 1.28 6.6l3.66 2.84C5.8 6.86 8.64 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#FBBC05"
                d="M4.94 14.56A7.1 7.1 0 0 1 4.56 12c0-.89.15-1.75.38-2.56V6.6H1.28A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.66-2.84z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.36 0-6.2-1.86-7.06-4.44H1.28v2.84C3.25 21.31 7.31 24 12 24z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2C2A2F]" />
          <span className="text-[11px] font-mono-code uppercase text-[#B8AEB2]">or email</span>
          <div className="h-px flex-1 bg-[#2C2A2F]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="auth-name" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Full name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-[#B8AEB2]" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-phone" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Phone number (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-[#B8AEB2]" />
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contact phone number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/50 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="text-xs text-[#B8AEB2] font-medium block mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#B8AEB2]" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/50 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="text-xs text-[#B8AEB2] font-medium block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#B8AEB2]" />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter password'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/50 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign in with Email'
                : 'Create Account'}
            </span>
            <ArrowRight className="w-4 h-4 text-[#F4A6C0]" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-[#2C2A2F]">
          <button
            type="button"
            onClick={onBrowseGuest}
            className="text-xs text-[#F4A6C0] hover:underline cursor-pointer"
          >
            Browse listings without signing in →
          </button>
        </div>
      </div>
    </div>
  );
};
