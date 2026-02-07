import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Dumbbell, Trash2, X, Plus, Check, CheckCircle } from 'lucide-react';
import { saveFutureEvent, getFutureEvents, getLogs, FutureEvent, deleteFutureEvent, LogEntry, checkConflict, checkFutureConflict, deleteLog } from '../lib/storage';

interface CombinedEvent extends Omit<FutureEvent, 'id'> {
    id: string;
    source: 'future_event' | 'log';
    logId?: string; // If source is log
    isCompleted?: boolean;
}

export default function Calendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Data Loading
    const [rawFutureEvents, setRawFutureEvents] = useState<FutureEvent[]>(getFutureEvents());
    const [rawLogs, setRawLogs] = useState<LogEntry[]>(getLogs());

    const refreshData = () => {
        setRawFutureEvents(getFutureEvents());
        setRawLogs(getLogs());
    };

    // Swipe Helper Component
    const SwipeableItem = ({ children, onDelete, onClick }: { children: React.ReactNode, onDelete: () => void, onClick?: () => void }) => {
        const [startX, setStartX] = useState<number | null>(null);
        const [offset, setOffset] = useState(0);

        const onTouchStart = (e: React.TouchEvent) => {
            setStartX(e.touches[0].clientX);
        };

        const onTouchMove = (e: React.TouchEvent) => {
            if (startX === null) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            if (diff < 0) setOffset(Math.max(diff, -100)); // Swipe left limit
        };

        const onTouchEnd = () => {
            if (offset < -50) {
                // Snap open
                setOffset(-80);
            } else {
                setOffset(0);
            }
            setStartX(null);
        };

        return (
            <div className="relative overflow-hidden rounded-xl">
                {/* Delete Action layer */}
                <div className="absolute inset-y-0 right-0 w-20 bg-error flex items-center justify-center text-white z-0">
                    <Trash2 size={20} onClick={(e) => { e.stopPropagation(); onDelete(); }} />
                </div>

                {/* Content Layer */}
                <div
                    className="relative z-10 bg-surface transition-transform duration-200"
                    style={{ transform: `translateX(${offset}px)` }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onClick={onClick}
                >
                    {children}
                </div>
            </div>
        );
    };

    // Combine Data Sources
    const events: CombinedEvent[] = useMemo(() => {
        const combined: CombinedEvent[] = [];

        // 1. Future Events (Placeholder/Planned)
        rawFutureEvents.forEach(e => {
            combined.push({ ...e, source: 'future_event' });
        });

        // 2. Log Entries (Active Sessions with Targets)
        rawLogs.forEach(l => {
            if (l.targetStartTime) {
                // Convert timestamp to YYYY-MM-DD
                const d = new Date(l.targetStartTime);
                const dateStr = d.toISOString().split('T')[0];

                combined.push({
                    id: l.id,
                    date: dateStr,
                    title: l.title || 'Planned Session',
                    type: 'training', // Logs are usually training unless specified otherwise in future
                    intensity: l.intensity || 'threshold',
                    duration: l.duration || 'medium',
                    processed: true,
                    source: 'log',
                    logId: l.id,
                    isCompleted: l.status === 'completed'
                });
            }
        });

        return combined;
    }, [rawFutureEvents, rawLogs]);

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [currentDate]);

    const firstDayOfMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month, 1).getDay();
    }, [currentDate]);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Helper: Check if a day is inside the 3-day PREP window of an event
    const getPrepInfo = (day: number) => {
        const currentMs = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();

        // Skip past days (Don't show prep for yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentMs < today.getTime()) return [];

        // Look for events 1, 2, or 3 days AHEAD
        // i.e. EventDate - CurrentDate between 1 and 3 days (approx in ms)

        const prepsFor = events.filter(e => {
            const eventMs = new Date(e.date).getTime();
            // We want noon-to-noon comparison to avoid timezone edge cases roughly
            // Simply: diff in days
            const diffDays = (eventMs - currentMs) / (1000 * 60 * 60 * 24);
            return diffDays > 0 && diffDays <= 3;
        });

        return prepsFor;
    };

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.date === dateStr);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    // Add Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState<FutureEvent['type']>('race');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');

    const openAddModal = () => {
        // Default to today if nothing selected
        const baseDate = selectedDate || new Date().toISOString().split('T')[0];
        if (!selectedDate) setSelectedDate(baseDate);
        setNewEventDate(baseDate);
        setShowAddModal(true);
    };

    const handleAddEvent = () => {
        if (!newEventDate || !newEventTitle) return;

        // Check for specific date conflicts using our new helper
        const conflictWarning = checkFutureConflict(newEventDate);
        if (conflictWarning) {
            if (!confirm(`⚠️ ${conflictWarning}\n\nDo you still want to schedule this event?`)) {
                return;
            }
        } else {
            // Also check legacy time-based conflict for active logs?
            const raceTime = new Date(`${newEventDate}T${newEventTime}`).getTime();
            if (checkConflict(raceTime, 180)) {
                if (!confirm("Contrast detected! You already have an active session overlapping with this time.\n\nContinue anyway?")) {
                    return;
                }
            }
        }

        saveFutureEvent({
            date: newEventDate,
            title: newEventTitle,
            type: newEventType,
            intensity: newEventType === 'race' ? 'max_effort' : 'threshold',
            duration: 'long'
        });

        refreshData();
        setShowAddModal(false);
        setNewEventTitle('');
    };

    // Event Details Modal State
    const [selectedEvent, setSelectedEvent] = useState<FutureEvent | null>(null);

    const openEventDetails = (event: FutureEvent) => {
        setSelectedEvent(event);
    };

    const handleDeleteFromModal = () => {
        if (!selectedEvent) return;
        if (confirm(`Delete "${selectedEvent.title}"?`)) {
            deleteFutureEvent(selectedEvent.id);
            refreshData();
            setSelectedEvent(null);
        }
    };

    // Calculate plan dates
    const getPlanSchedule = (eventDate: string) => {
        const date = new Date(eventDate);
        return [
            { label: 'T-72h (Start Prep)', date: new Date(date.getTime() - 3 * 24 * 60 * 60 * 1000), focus: 'Hydration & Low Residue' },
            { label: 'T-48h', date: new Date(date.getTime() - 2 * 24 * 60 * 60 * 1000), focus: 'Simple Carbs, No Fiber' },
            { label: 'T-24h', date: new Date(date.getTime() - 1 * 24 * 60 * 60 * 1000), focus: 'Gut Rest, Electrolytes' },
            { label: 'Event Day', date: date, focus: 'Performance & Timing' },
        ];
    };

    // Handle Click on an Event Item
    const handleEventClick = (event: CombinedEvent) => {
        if (event.source === 'log' && event.logId) {
            if (event.isCompleted) {
                navigate(`/report/${event.logId}`);
            } else {
                navigate(`/checkin?editId=${event.logId}`);
            }
        } else {
            // It's a FutureEvent -> Open Details
            const futureEvent = rawFutureEvents.find(e => e.id === event.id);
            if (futureEvent) openEventDetails(futureEvent);
        }
    };

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedEventIds(new Set());
    };

    const toggleEventSelection = (id: string) => {
        const newSet = new Set(selectedEventIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedEventIds(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedEventIds.size === 0) return;

        if (confirm(`Delete ${selectedEventIds.size} selected items?`)) {
            let refreshNeeded = false;
            selectedEventIds.forEach(id => {
                const evt = events.find(e => e.id === id);
                if (evt) {
                    if (evt.source === 'future_event') {
                        deleteFutureEvent(evt.id);
                    } else if (evt.logId) {
                        deleteLog(evt.logId);
                    }
                    refreshNeeded = true;
                }
            });

            if (refreshNeeded) {
                refreshData();
                setIsSelectionMode(false);
                setSelectedEventIds(new Set());
            }
        }
    };

    // Derived state for visible events to allow checking length for UI states
    const visibleEvents = useMemo(() => {
        if (selectedDate) {
            const day = parseInt(selectedDate.split('-')[2]);
            return [...getEventsForDay(day), ...getPrepInfo(day)];
        } else {
            return events.filter(e => {
                const d = new Date(e.date);
                d.setHours(24, 0, 0, 0);
                return d >= new Date() && !e.isCompleted;
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
        }
    }, [selectedDate, events, currentDate]);

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans min-h-screen text-text bg-background">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 pt-6 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="bg-surface p-2.5 rounded-full text-text-inverse hover:bg-black/5 transition shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text leading-none font-display mb-1">Planner</h1>
                        <p className="text-text/60 font-mono text-xs uppercase tracking-wider">Schedule & Prep</p>
                    </div>
                </div>
            </header>

            {/* Bulk Action Bar */}
            {isSelectionMode && (
                <div className="fixed bottom-0 left-0 right-0 z-[60] bg-surface text-text-inverse border-t border-black/5 p-6 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl safe-area-inset-bottom">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-text-inverse font-medium">
                            {selectedEventIds.size} selected
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={toggleSelectionMode}
                                className="px-6 py-3 rounded-full bg-background text-text font-bold text-sm border border-black/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedEventIds.size === 0}
                                className="px-6 py-3 rounded-full bg-error text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-text">
                    {monthNames[currentDate.getMonth()]} <span className="text-primary font-normal">{currentDate.getFullYear()}</span>
                </h2>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 bg-surface rounded-full text-text-inverse hover:text-text transition shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 bg-surface rounded-full text-text-inverse hover:text-text transition shadow-sm">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center shrink-0">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-xs font-bold text-text/80 uppercase tracking-wider py-2">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 shrink-0">
                {/* Empty Cells */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    const dayEvents = getEventsForDay(day);
                    const prepEvents = getPrepInfo(day);

                    const hasRace = dayEvents.some(e => e.type === 'race');
                    const hasTraining = dayEvents.some(e => e.type === 'training');
                    const isPrepDay = prepEvents.length > 0 && dayEvents.length === 0;

                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition group border
                                ${selectedDate === dateStr ? 'bg-text text-background shadow-lg scale-105 z-10' :
                                    isToday(day) ? 'bg-primary text-onPrimary shadow-md shadow-primary/30' :
                                        isPrepDay ? 'bg-surface border-primary/20 text-text-inverse' :
                                            'bg-surface border-transparent text-text-inverse hover:bg-black/5 shadow-sm'}
                            `}
                        >
                            <span className={`text-sm font-medium relative z-10`}>{day}</span>
                            {isPrepDay && <div className="absolute inset-0 bg-secondary/10 rounded-xl"></div>}
                            <div className="flex gap-1 mt-1 relative z-10">
                                {hasRace && <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_5px_theme(colors.red.500)]"></div>}
                                {hasTraining && <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_theme(colors.green.500)]"></div>}
                                {isPrepDay && <div className="w-1 h-1 rounded-full bg-secondary/50"></div>}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Upcoming List */}
            <div className="mt-6 flex-1 overflow-y-auto pb-8 min-h-0 border-t border-black/5 pt-6">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-background z-20 pb-2 pt-1 border-b border-background">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
                        {selectedDate ? `Events: ${new Date(selectedDate).toLocaleDateString('en-GB')}` : "Upcoming Events"}
                    </h3>
                    <div className="flex gap-2">
                        {visibleEvents.length > 0 && (
                            <button
                                onClick={toggleSelectionMode}
                                className={`p-2 rounded-full transition border ${isSelectionMode ? 'bg-primary text-onPrimary border-primary' : 'bg-surface text-text-inverse border-black/5 hover:bg-black/5'}`}
                            >
                                {isSelectionMode ? <Check size={16} /> : <CheckCircle size={16} />}
                            </button>
                        )}
                        {!isSelectionMode && (
                            <button
                                onClick={openAddModal}
                                className="bg-surface p-2 rounded-full text-text-inverse hover:bg-black/5 transition border border-black/5 shadow-sm"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {visibleEvents.map((event, idx) => {
                        const isSelected = selectedEventIds.has(event.id);
                        return (
                            <SwipeableItem
                                key={`${event.id}-${idx}`}
                                onClick={() => {
                                    if (isSelectionMode) toggleEventSelection(event.id);
                                    else handleEventClick(event);
                                }}
                                onDelete={() => {
                                    if (isSelectionMode) return;
                                    if (event.source === 'future_event') {
                                        deleteFutureEvent(event.id);
                                        refreshData();
                                    } else {
                                        if (confirm("Are you sure you want to delete this session log?")) {
                                            if (event.logId) deleteLog(event.logId);
                                            refreshData();
                                        }
                                    }
                                }}
                            >
                                <div className={`p-4 flex items-center justify-between group cursor-pointer border transition shadow-sm rounded-xl ${isSelected ? 'bg-primary/20 border-primary' : 'bg-surface text-text-inverse border-transparent hover:border-black/5'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`relative p-3 rounded-full ${event.type === 'race' ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'}`}>
                                            {event.type === 'race' ? <MapPin size={20} /> : <Dumbbell size={20} />}
                                            {isSelectionMode && (
                                                <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-onPrimary' : 'bg-black/5 text-secondary'}`}>
                                                    <Check size={14} className={isSelected ? 'scale-100' : 'scale-0'} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-text-inverse text-base">
                                                {event.title}
                                                {event.source === 'log' && (
                                                    event.isCompleted
                                                        ? <span className="ml-2 type-label bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">Done</span>
                                                        : <span className="ml-2 type-label bg-primary/20 text-text-inverse px-1.5 py-0.5 rounded">Active</span>
                                                )}
                                            </div>
                                            <div className="font-mono text-xs text-text-inverse/60 flex items-center gap-2">
                                                <span>
                                                    {new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                                {selectedDate && new Date(selectedDate) < new Date(event.date) && (
                                                    <span className="text-secondary opacity-80 italic">(Prepping)</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-text-inverse/30">
                                        {isSelectionMode ? (
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-onPrimary' : 'border-black/10'}`}>
                                                {isSelected && <Check size={14} />}
                                            </div>
                                        ) : <ChevronRight size={20} />}
                                    </div>
                                </div>
                            </SwipeableItem>
                        );
                    })}
                    {visibleEvents.length === 0 && <div className="text-center py-6 text-text/60 text-sm">No events found.</div>}
                </div>
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-text">Add Event</h3>
                                <p className="text-secondary text-sm font-mono mt-1">{new Date(selectedDate || '').toLocaleDateString('en-GB')}</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-secondary text-xs uppercase font-bold tracking-wider mb-2">Event Title</label>
                                <input type="text" placeholder="e.g. Marathon, Long Run" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full bg-background border border-black/5 rounded-xl p-4 text-white placeholder-secondary/50 outline-none focus:border-primary transition font-medium placeholder:text-white/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-secondary text-xs uppercase font-bold tracking-wider mb-2">Event Date</label>
                                    <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full bg-background border border-black/5 rounded-xl p-4 text-white outline-none focus:border-primary transition font-medium" />
                                </div>
                                <div>
                                    <label className="block text-secondary text-xs uppercase font-bold tracking-wider mb-2">Event Time</label>
                                    <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-full bg-background border border-black/5 rounded-xl p-4 text-white outline-none focus:border-primary transition font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-secondary text-xs uppercase font-bold tracking-wider mb-2">Event Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setNewEventType('race')} className={`p-4 rounded-xl flex items-center justify-center gap-2 transition border ${newEventType === 'race' ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/20' : 'bg-background text-secondary border-transparent'}`}>
                                        <MapPin size={18} /> <span className="font-bold">Race / Game</span>
                                    </button>
                                    <button onClick={() => setNewEventType('training')} className={`p-4 rounded-xl flex items-center justify-center gap-2 transition border ${newEventType === 'training' ? 'bg-success text-white border-success shadow-md shadow-success/20' : 'bg-background text-secondary border-transparent'}`}>
                                        <Dumbbell size={18} /> <span className="font-bold">Training</span>
                                    </button>
                                </div>
                            </div>
                            <button onClick={handleAddEvent} disabled={!newEventTitle} className="w-full bg-text text-white font-bold text-lg py-4 rounded-full mt-4 disabled:opacity-50 shadow-lg shadow-text/20">Schedule Event</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`type-label px-2 py-0.5 rounded ${selectedEvent.type === 'race' ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'}`}>{selectedEvent.type}</span>
                                </div>
                                <h3 className="text-3xl font-bold text-text mb-1 font-display">{selectedEvent.title}</h3>
                                <p className="text-secondary text-sm font-mono flex items-center gap-2">
                                    <MapPin size={14} />
                                    {new Date(selectedEvent.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Prep Plan Visualization */}
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Preparation Plan</h4>
                            <div className="space-y-4 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-black/5 -z-10"></div>

                                {getPlanSchedule(selectedEvent.date).map((step, idx) => {
                                    const isPast = new Date() > step.date;
                                    const isToday = new Date().toDateString() === step.date.toDateString();

                                    return (
                                        <div key={idx} className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-surface ${isToday ? 'bg-primary text-onPrimary' : isPast ? 'bg-secondary text-white' : 'bg-background text-secondary'}`}>
                                                {isToday || isPast ? <Check size={16} /> : <div className="w-2 h-2 rounded-full bg-current opacity-30"></div>}
                                            </div>
                                            <div className="pt-1">
                                                <div className="text-xs font-bold font-mono text-secondary mb-0.5">{step.label}</div>
                                                <div className="text-text font-bold mb-0.5">{step.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                                <div className="text-sm text-text-dim">{step.focus}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>



                        <button
                            onClick={() => navigate(`/preview/${selectedEvent.id}`)}
                            className="w-full bg-surface border border-secondary/20 text-text font-bold text-lg py-4 rounded-full mb-3 shadow-sm hover:bg-black/5 transition"
                        >
                            View Full Protocol
                        </button>

                        <button
                            onClick={handleDeleteFromModal}
                            className="w-full bg-error/10 text-error font-bold text-lg py-4 rounded-full mt-4 flex items-center justify-center gap-2 hover:bg-error/20 transition"
                        >
                            <Trash2 size={20} />
                            Cancel Event
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
