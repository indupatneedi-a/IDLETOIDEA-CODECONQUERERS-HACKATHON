import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Film } from 'lucide-react';
import { auth, testConnection } from './firebase';
import { api } from './services/api';
import {
  User,
  Resource,
  Slot,
  RequestItem,
  HandoverRecord,
  AppNotification,
  PendingIntent,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematicIntro } from './components/CinematicIntro';
import { TopBar } from './components/TopBar';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { ResourceDetailPage } from './pages/ResourceDetailPage';
import { QuizPage } from './pages/QuizPage';
import { RequestModal } from './pages/RequestModal';
import { RequesterDashboard } from './pages/RequesterDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { CreateListingPage } from './pages/CreateListingPage';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { IncidentView } from './pages/IncidentView';
import { LoginPage } from './pages/LoginPage';
import { CheckoutModal, ReturnModal } from './pages/HandoverModals';
import { TimelineModal } from './pages/TimelineModal';
import { StaticPages, StaticPageType } from './pages/StaticPages';

function AppShell() {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('idletoidea_intro_seen') !== '1';
    } catch {
      return false;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<string>('discover');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modal states
  const [bookingContext, setBookingContext] = useState<{
    resource: Resource;
    slot?: Slot;
  } | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<{
    request: RequestItem;
    resource: Resource | null;
  } | null>(null);
  const [returnContext, setReturnContext] = useState<{
    request: RequestItem;
    resource: Resource | null;
    handover: HandoverRecord | null;
  } | null>(null);
  const [timelineRequestId, setTimelineRequestId] = useState<string | null>(null);

  // Verify Firestore connection on startup
  useEffect(() => {
    void testConnection();
  }, []);

  // Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setCurrentUser(null);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await api.ensureUserProfile(fbUser);
        setCurrentUser(profile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setCurrentUser(null);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Public subscription to active listings (works for visitors without sign-in)
  useEffect(() => {
    setResourcesLoading(true);
    const unsubscribe = api.subscribeActiveResources(
      (list) => {
        setResources(list);
        setResourcesLoading(false);
      },
      (err) => {
        console.error('Active listings subscription error:', err);
        setResourcesLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Authenticated notifications subscription
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    const unsubscribe = api.subscribeNotifications(currentUser.id, (items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  const navigateTo = useCallback((screen: string) => {
    if (screen.startsWith('resource-detail:')) {
      const id = screen.slice('resource-detail:'.length);
      setSelectedResourceId(id);
      setCurrentScreen('resource-detail');
    } else if (screen.startsWith('incident-view:')) {
      const id = screen.slice('incident-view:'.length);
      setSelectedIncidentId(id);
      setCurrentScreen('incident-view');
    } else {
      setCurrentScreen(screen);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDismissIntro = () => {
    try {
      localStorage.setItem('idletoidea_intro_seen', '1');
    } catch {
      // ignore storage errors
    }
    setShowIntro(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setFirebaseUser(null);
    setPendingIntent(null);
    setBookingContext(null);
    setCheckoutContext(null);
    setReturnContext(null);
    setTimelineRequestId(null);
    setCurrentScreen('discover');
  };

  const isEmailVerified = Boolean(firebaseUser?.emailVerified);

  const handleStartListEquipment = () => {
    if (!firebaseUser || !currentUser || !isEmailVerified) {
      setPendingIntent({ type: 'create-listing' });
      navigateTo('login');
      return;
    }
    navigateTo('create-listing');
  };

  const handleRequireBookingSignIn = (resourceId: string, slotId?: string) => {
    setPendingIntent({ type: 'request-booking', resourceId, slotId });
    navigateTo('login');
  };

  const handleRequireQuizSignIn = (quizId: string, resourceId: string) => {
    setPendingIntent({ type: 'take-quiz', quizId, resourceId });
    navigateTo('login');
  };

  const handleRequestBooking = (resource: Resource, slot?: Slot) => {
    if (!firebaseUser || !currentUser || !isEmailVerified) {
      handleRequireBookingSignIn(resource.id, slot?.id);
      return;
    }
    setBookingContext({ resource, slot });
  };

  const handleOpenQuiz = (quizId: string, resourceId: string) => {
    if (!firebaseUser || !currentUser || !isEmailVerified) {
      handleRequireQuizSignIn(quizId, resourceId);
      return;
    }
    setSelectedQuizId(quizId);
    setSelectedResourceId(resourceId);
    navigateTo('quizzes');
  };

  const handleAuthComplete = (user: User) => {
    setCurrentUser(user);

    if (pendingIntent) {
      const intent = pendingIntent;
      setPendingIntent(null);

      if (intent.type === 'create-listing') {
        navigateTo('create-listing');
        return;
      }
      if (intent.type === 'request-booking') {
        setSelectedResourceId(intent.resourceId);
        navigateTo('resource-detail');
        return;
      }
      if (intent.type === 'take-quiz') {
        setSelectedQuizId(intent.quizId);
        setSelectedResourceId(intent.resourceId);
        navigateTo('quizzes');
        return;
      }
      if (intent.type === 'navigate') {
        navigateTo(intent.screen);
        return;
      }
    }

    navigateTo('discover');
  };

  const isStaticPage =
    currentScreen === 'about' ||
    currentScreen === 'terms' ||
    currentScreen === 'privacy' ||
    currentScreen === 'contact';

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#F5F1F2] flex flex-col justify-between selection:bg-[#7A1F3D] selection:text-[#F5F1F2] film-grain-bg font-sans">
      {showIntro && <CinematicIntro onEnter={handleDismissIntro} />}

      <TopBar
        currentUser={currentUser}
        emailVerified={isEmailVerified}
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        onStartListEquipment={handleStartListEquipment}
        onSignOut={handleSignOut}
        notifications={notifications}
        onMarkNotificationRead={(id) => api.markNotificationRead(id)}
      />

      <main className="flex-1 pb-16">
        {!authReady && currentScreen !== 'discover' && !isStaticPage ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#7A1F3D] border-t-[#F4A6C0] animate-spin" />
          </div>
        ) : (
          <>
            {currentScreen === 'login' && (
              <LoginPage
                firebaseUser={firebaseUser}
                currentUser={currentUser}
                pendingIntent={pendingIntent}
                onAuthComplete={handleAuthComplete}
                onBrowseGuest={() => {
                  setPendingIntent(null);
                  navigateTo('discover');
                }}
                onSignOut={handleSignOut}
              />
            )}

            {currentScreen === 'discover' && (
              <DiscoveryPage
                currentUser={currentUser}
                resources={resources}
                isLoading={resourcesLoading}
                onSelectResource={(id) => {
                  setSelectedResourceId(id);
                  navigateTo('resource-detail');
                }}
                onStartListEquipment={handleStartListEquipment}
              />
            )}

            {currentScreen === 'resource-detail' && selectedResourceId && (
              <ResourceDetailPage
                resourceId={selectedResourceId}
                currentUser={currentUser}
                onBack={() => navigateTo('discover')}
                onOpenQuiz={handleOpenQuiz}
                onRequestBooking={handleRequestBooking}
                onRequireSignIn={handleRequireBookingSignIn}
                onRequireQuizSignIn={handleRequireQuizSignIn}
              />
            )}

            {currentScreen === 'quizzes' && selectedQuizId && (
              <QuizPage
                quizId={selectedQuizId}
                currentUser={currentUser}
                onBack={() => navigateTo(selectedResourceId ? 'resource-detail' : 'discover')}
                onSuccessReturn={(resId) => {
                  setSelectedResourceId(resId);
                  navigateTo('resource-detail');
                }}
              />
            )}

            {currentScreen === 'requester-dashboard' && (
              <RequesterDashboard
                currentUser={currentUser}
                resources={resources}
                onViewTimeline={(reqId) => setTimelineRequestId(reqId)}
                onOpenReturnModal={(request, resource, handover) =>
                  setReturnContext({ request, resource, handover })
                }
                onNavigateToDiscover={() => navigateTo('discover')}
              />
            )}

            {currentScreen === 'owner-dashboard' && (
              <OwnerDashboard
                currentUser={currentUser}
                onNavigateToCreateListing={handleStartListEquipment}
                onViewTimeline={(reqId) => setTimelineRequestId(reqId)}
                onSelectResource={(id) => {
                  setSelectedResourceId(id);
                  navigateTo('resource-detail');
                }}
                onOpenCheckoutModal={(request, resource) =>
                  setCheckoutContext({ request, resource })
                }
                onOpenReturnModal={(request, resource, handover) =>
                  setReturnContext({ request, resource, handover })
                }
              />
            )}

            {currentScreen === 'create-listing' && (
              <CreateListingPage
                currentUser={currentUser}
                onBack={() =>
                  navigateTo(currentUser?.role === 'owner' ? 'owner-dashboard' : 'discover')
                }
                onSuccess={(id) => {
                  setSelectedResourceId(id);
                  navigateTo('resource-detail');
                }}
                onNavigateLogin={() => {
                  setPendingIntent({ type: 'create-listing' });
                  navigateTo('login');
                }}
              />
            )}

            {currentScreen === 'supervisor-dashboard' && (
              <SupervisorDashboard
                currentUser={currentUser}
                resources={resources}
                onViewTimeline={(reqId) => setTimelineRequestId(reqId)}
                onOpenCheckoutModal={(request, resource) =>
                  setCheckoutContext({ request, resource })
                }
                onOpenReturnModal={(request, resource, handover) =>
                  setReturnContext({ request, resource, handover })
                }
                onOpenIncidentView={(incidentId) => {
                  setSelectedIncidentId(incidentId);
                  navigateTo('incident-view');
                }}
              />
            )}

            {currentScreen === 'admin-dashboard' && (
              <AdminDashboard
                currentUser={currentUser}
                onOpenIncidentView={(incidentId) => {
                  setSelectedIncidentId(incidentId);
                  navigateTo('incident-view');
                }}
              />
            )}

            {currentScreen === 'incident-view' && selectedIncidentId && (
              <IncidentView
                incidentId={selectedIncidentId}
                currentUser={currentUser}
                onBack={() => {
                  if (currentUser?.role === 'owner') navigateTo('owner-dashboard');
                  else if (currentUser?.role === 'supervisor') navigateTo('supervisor-dashboard');
                  else if (currentUser?.role === 'admin') navigateTo('admin-dashboard');
                  else navigateTo('requester-dashboard');
                }}
              />
            )}

            {isStaticPage && (
              <StaticPages
                page={currentScreen as StaticPageType}
                onBack={() => navigateTo('discover')}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <RequestModal
        isOpen={Boolean(bookingContext)}
        onClose={() => setBookingContext(null)}
        resource={bookingContext?.resource || null}
        slot={bookingContext?.slot}
        currentUser={currentUser}
        onNavigateToDashboard={() => {
          setBookingContext(null);
          navigateTo('requester-dashboard');
        }}
      />

      <CheckoutModal
        isOpen={Boolean(checkoutContext)}
        onClose={() => setCheckoutContext(null)}
        request={checkoutContext?.request || null}
        resource={checkoutContext?.resource || null}
        currentUser={currentUser}
      />

      <ReturnModal
        isOpen={Boolean(returnContext)}
        onClose={() => setReturnContext(null)}
        request={returnContext?.request || null}
        resource={returnContext?.resource || null}
        handover={returnContext?.handover || null}
        currentUser={currentUser}
      />

      <TimelineModal
        isOpen={Boolean(timelineRequestId)}
        onClose={() => setTimelineRequestId(null)}
        requestId={timelineRequestId}
        currentUser={currentUser}
      />

      {/* Footer */}
      <footer className="border-t border-[#2C2A2F] bg-[#0D0D0F] py-8 px-4 sm:px-6 lg:px-8 text-xs text-[#B8AEB2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#F4A6C0]" />
            <span className="font-title text-sm font-bold text-[#F5F1F2] tracking-wider">
              IDLETOIDEA
            </span>
            <span className="text-[#2C2A2F]">·</span>
            <span>Shared equipment &amp; workspaces for makerspaces</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-5" aria-label="Footer Navigation">
            <button
              type="button"
              onClick={() => navigateTo('about')}
              className="text-[#B8AEB2] hover:text-[#F4A6C0] transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigateTo('terms')}
              className="text-[#B8AEB2] hover:text-[#F4A6C0] transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => navigateTo('privacy')}
              className="text-[#B8AEB2] hover:text-[#F4A6C0] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contact')}
              className="text-[#B8AEB2] hover:text-[#F4A6C0] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
