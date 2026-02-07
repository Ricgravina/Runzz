import { Route, Routes, useLocation } from 'react-router-dom';
import MobileShell from './layout/MobileShell';
import Home from './routes/Home';
import CheckIn from './routes/CheckIn';
import History from './routes/History';
import Profile from './routes/Profile';
import Calendar from './routes/Calendar';
import Feedback from './routes/Feedback';
import Report from './routes/Report';
import InstantHelp from './routes/InstantHelp';
import EventPreview from './routes/EventPreview';
import Login from './routes/auth/Login';
import SignUp from './routes/auth/SignUp';
import VerifyEmail from './routes/auth/VerifyEmail';
import ProtectedBox from './components/ProtectedBox';
import { AuthProvider } from './contexts/AuthContext';

import Diagnosis from './routes/profile/Diagnosis';
import Medications from './routes/profile/Medications';
import Supplements from './routes/profile/Supplements';
import { useEffect } from 'react';
import { getActiveSession, getFutureEvents, markEventProcessed, saveLog } from './lib/storage';

function AppContent() {
    const location = useLocation();

    // Routes that should NOT have the bottom nav
    const noNavRoutes = ['/checkin', '/feedback', '/help', '/login', '/signup'];
    const showNav = !noNavRoutes.some(path => location.pathname.startsWith(path));

    // Auto-Generate Protocol Logic
    useEffect(() => {
        const checkUpcomingEvents = () => {
            const events = getFutureEvents();
            const active = getActiveSession();

            // Only create if we don't have an active session
            if (active) return;

            const now = new Date();

            for (const event of events) {
                if (event.processed) continue;

                const eventDate = new Date(event.date);
                // Calculate days difference
                const diffTime = eventDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Trigger window: 3 days out (e.g. 72h)
                if (diffDays <= 3 && diffDays > 0) {
                    // Create the Prep Session
                    saveLog({
                        sessionTime: 'race_prep_72h',
                        intensity: event.intensity,
                        duration: event.duration,
                        gutScale: 8, // Optimistic default
                        symptoms: [],
                        plan: null, // Generated on open
                        targetStartTime: eventDate.getTime(),
                        notes: `Auto-generated prep for ${event.title}`
                    });

                    markEventProcessed(event.id);
                }
            }
        };

        checkUpcomingEvents();
    }, [location.pathname]);

    return (
        <div className="w-full h-[100dvh] bg-background relative flex flex-col shrink-0 overflow-hidden pt-[calc(env(safe-area-inset-top)+10px)]">

            <main className="flex-1 overflow-y-auto overscroll-y-auto scroll-smooth no-scrollbar">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedBox />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/checkin" element={<CheckIn />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/feedback/:id" element={<Feedback />} />
                        <Route path="/report/:id" element={<Report />} />
                        <Route path="/profile/diagnosis" element={<Diagnosis />} />
                        <Route path="/profile/medications" element={<Medications />} />
                        <Route path="/profile/supplements" element={<Supplements />} />
                        <Route path="/help" element={<InstantHelp />} />
                        <Route path="/preview/:id" element={<EventPreview />} />
                    </Route>
                </Routes>
            </main>

            {showNav && <MobileShell />}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
