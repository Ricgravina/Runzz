import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Calendar as CalendarIcon, ClipboardList as HistoryIcon, MessageCircle } from 'lucide-react';
import { getActiveSession, getFutureEvents, getLogs } from '../lib/storage';
import { useState, useEffect } from 'react';
import TipsCarousel from '../components/TipsCarousel';
import CountdownTimer from '../components/CountdownTimer';

export default function Home() {
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState<any>(null);
    const [nextEvent, setNextEvent] = useState<any>(null);
    const [stats, setStats] = useState<{ count: number, adherence: number }>({ count: 0, adherence: 0 });

    useEffect(() => {
        setActiveSession(getActiveSession());

        // Planner Logic
        const events = getFutureEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = events.find(e => {
            // Fix: Interpret "2024-01-22" as local date, not UTC midnight which might be yesterday in local time if west
            // Actually, storage saves 'YYYY-MM-DD'. new Date('YYYY-MM-DD') is UTC.
            // Let's ensure strict comparison:
            // Compare string dates since standard format is YYYY-MM-DD
            // Or just ensure we treat the event date as end of day? 
            // Simplest: 
            // Compare string dates since standard format is YYYY-MM-DD
            // This avoids timezone issues with new Date(e.date) defaulting to UTC midnight
            // If event date string >= today's local date string
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
            return e.date >= todayStr;
        });
        setNextEvent(upcoming);

        // History Logic
        const logs = getLogs().filter(l => l.status === 'completed');
        const count = logs.length;
        // Mock Adherence
        const adherence = count > 0 ? 85 + (count % 15) : 0;
        setStats({ count, adherence });

    }, []);

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans min-h-screen text-text bg-background">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 pt-6 shrink-0">
                <div>
                    <h1 className="text-4xl font-bold text-text tracking-tight font-display mb-1">
                        RUNZZ
                    </h1>
                    <div className="text-white/60 font-mono text-sm uppercase tracking-wide">
                        Uninterrupted Performance
                    </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center border-2 border-primary shadow-sm text-onPrimary font-display font-bold text-2xl">
                    R
                </div>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-2 gap-4 flex-1 content-start">

                {activeSession ? (
                    <button
                        onClick={() => navigate(`/checkin?editId=${activeSession.id}`)}
                        className="col-span-2 bg-primary text-onPrimary rounded-[2.5rem] p-6 text-left relative overflow-hidden group shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full mb-4 backdrop-blur-sm border border-black/5">
                                    <div className="w-2 h-2 rounded-full bg-black animate-pulse"></div>
                                    <span className="type-label text-onPrimary flex items-center gap-2">
                                        <span>Live</span>
                                        <span className="opacity-40">|</span>
                                        <CountdownTimer targetTime={activeSession.targetStartTime || activeSession.timestamp} variant="minimal" />
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold mb-2 font-display leading-none">Active<br />Session</h2>
                                <p className="text-onPrimary/60 type-label">Tap to update protocol</p>
                            </div>
                            <div className="bg-black/10 p-2.5 rounded-full text-onPrimary">
                                <ArrowUpRight size={24} />
                            </div>
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/checkin')}
                        className="col-span-2 bg-primary text-onPrimary rounded-[2.5rem] p-6 text-left relative overflow-hidden group shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="mb-4 bg-black/10 w-12 h-12 rounded-full flex items-center justify-center text-onPrimary">
                                    <ArrowUpRight size={24} />
                                </div>
                                <h2 className="text-3xl font-bold text-onPrimary mb-2 font-display leading-[0.9] tracking-tight">START<br />SESSION</h2>
                                <p className="text-onPrimary/60 type-label">Check-in & Build</p>
                            </div>
                        </div>
                    </button>
                )}

                {/* Instant Help Card */}
                <button
                    onClick={() => navigate('/help')}
                    className="col-span-2 bg-surface text-text-inverse rounded-[2.5rem] p-5 text-left relative overflow-hidden group shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                >
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                <MessageCircle size={20} />
                            </div>
                            <div>
                                <div className="text-lg font-bold font-display leading-tight text-secondary">Instant Help</div>
                                <div className="type-label text-secondary/70">Get AI Guidance</div>
                            </div>
                        </div>
                        <div className="bg-secondary/10 px-3 py-1.5 rounded-full type-label text-secondary">
                            Chat
                        </div>
                    </div>
                </button>

                {/* Planner Card */}
                <button
                    onClick={() => navigate('/calendar')}
                    className="bg-surface text-text-inverse rounded-[2.5rem] p-6 relative overflow-hidden group flex flex-col justify-between aspect-square shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="flex justify-between w-full">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white border border-black/5">
                            <CalendarIcon size={24} />
                        </div>
                        {/* Dynamic Insight Badge */}
                        {nextEvent && (
                            <div className="bg-primary/20 px-2 py-1 rounded-md">
                                <span className="type-label text-text-inverse">
                                    T-{Math.max(0, Math.ceil((new Date(nextEvent.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d Prep
                                </span>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-xl font-bold text-text-inverse mb-1 font-display">PLANNER</div>
                        {nextEvent ? (
                            <div className="text-xs text-text-inverse/70 font-medium leading-tight">
                                <span className="block text-primary font-bold uppercase text-xxs tracking-wider mb-0.5">Focus: Hydration</span>
                                {nextEvent.title}
                            </div>
                        ) : (
                            <div className="text-xs text-text-inverse/70 font-medium">
                                No upcoming events.
                                <br />
                                <span className="opacity-50 text-xxs uppercase font-bold tracking-wider">Plan ahead</span>
                            </div>
                        )}
                    </div>
                </button>

                {/* History Card */}
                <button
                    onClick={() => navigate('/history')}
                    className="bg-surface text-text-inverse rounded-[2.5rem] p-5 relative overflow-hidden group flex flex-col justify-between aspect-square shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="flex justify-between w-full">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-black/5 flex items-center justify-center text-text-inverse">
                            <HistoryIcon size={24} />
                        </div>
                        {/* Streak Badge */}
                        {stats.count > 0 && (
                            <div className="bg-secondary/10 px-2 py-1 rounded-md">
                                <span className="type-label text-secondary">
                                    {stats.count}x Streak
                                </span>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-xl font-bold text-text-inverse mb-1 font-display">HISTORY</div>
                        {stats.count > 0 ? (
                            <div className="text-xs text-text-inverse/70 font-medium leading-tight">
                                <span className="block text-success font-bold uppercase text-xxs tracking-wider mb-0.5">High Adherence</span>
                                {stats.adherence}% Protocol Match
                            </div>
                        ) : (
                            <div className="text-xs text-text-inverse/70 font-medium">
                                Start your journey.
                                <br />
                                <span className="opacity-50 text-xxs uppercase font-bold tracking-wider">Log first run</span>
                            </div>
                        )}
                    </div>
                </button>

                {/* Tips Carousel */}
                <TipsCarousel />

            </div >
        </div >
    );
}
