import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Clock, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

interface DateTimePickerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (isoString: string) => void;
    initialValue?: string; // ISO string
}

type ViewMode = 'overview' | 'calendar' | 'time';

export default function DateTimePickerSheet({ isOpen, onClose, onSelect, initialValue }: DateTimePickerSheetProps) {
    if (!isOpen) return null;

    const [view, setView] = useState<ViewMode>('overview');

    // Initialize with provided value or nearest hour
    const [selectedDate, setSelectedDate] = useState(() => {
        if (initialValue) return new Date(initialValue);
        const d = new Date();
        d.setMinutes(0, 0, 0); // Reset to top of hour
        d.setHours(d.getHours() + 1); // Next hour
        return d;
    });

    const [tempTime, setTempTime] = useState(() => {
        return selectedDate.toTimeString().slice(0, 5); // HH:MM
    });

    // Calendar State
    const [displayMonth, setDisplayMonth] = useState(new Date(selectedDate));

    // Time Component State (Moved to top level to avoid hook violation)
    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);
    const itemHeight = 56;

    useEffect(() => {
        if (view === 'time') {
            const [currentH, currentM] = tempTime.split(':').map(Number);
            // Small timeout ensuring layout is stable before scrolling
            setTimeout(() => {
                if (hoursRef.current) hoursRef.current.scrollTo({ top: currentH * itemHeight, behavior: 'instant' });
                if (minutesRef.current) minutesRef.current.scrollTo({ top: Math.round(currentM / 5) * itemHeight, behavior: 'instant' });
            }, 10);
        }
    }, [view]); // Re-run when view switches to 'time'

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hours' | 'minutes') => {
        const index = Math.round(e.currentTarget.scrollTop / itemHeight);
        const [currentH, currentM] = tempTime.split(':').map(Number);

        if (type === 'hours') {
            const val = Math.max(0, Math.min(23, index));
            if (val !== currentH) setTempTime(`${String(val).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`);
        } else {
            const val = Math.max(0, Math.min(11, index)) * 5;
            if (val !== currentM) setTempTime(`${String(currentH).padStart(2, '0')}:${String(val).padStart(2, '0')}`);
        }
    };

    const handleConfirm = () => {
        const [h, m] = tempTime.split(':').map(Number);
        const final = new Date(selectedDate);
        final.setHours(h, m, 0, 0);

        // construct local ISO: YYYY-MM-DDTHH:MM
        const offset = final.getTimezoneOffset() * 60000;
        const localISO = (new Date(final.getTime() - offset)).toISOString().slice(0, 16);

        onSelect(localISO);
        onClose();
    };

    // --- CALENDAR LOGIC ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(displayMonth);
        const firstDay = getFirstDayOfMonth(displayMonth);
        const days = [];

        // Previous month filler
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const changeMonth = (delta: number) => {
        const newMonth = new Date(displayMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setDisplayMonth(newMonth);
    };


    // --- RENDERERS ---

    const renderOverview = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-secondary font-display">Time & Date</h3>
                <button onClick={onClose} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text-inverse/80 transition">
                    <span className="sr-only">Close</span>
                    <ChevronDown size={24} />
                </button>
            </div>

            {/* Date Card */}
            <div>
                <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Date
                </div>
                <button
                    onClick={() => setView('calendar')}
                    className="w-full bg-surface rounded-2xl p-6 flex flex-col items-center justify-center border-2 border-primary/20 hover:border-primary transition shadow-sm h-28"
                >
                    <span className="text-3xl font-display font-bold text-secondary">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-medium text-secondary/60 mt-1">Tap to change</span>
                </button>
            </div>

            {/* Time Card */}
            <div>
                <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock size={14} /> Start Time
                </div>
                <button
                    onClick={() => setView('time')}
                    className="w-full bg-surface rounded-2xl p-6 flex flex-col items-center justify-center border-2 border-primary/20 hover:border-primary transition shadow-sm h-28"
                >
                    <span className="text-4xl font-display font-bold text-text-inverse">
                        {tempTime}
                    </span>
                    <Clock size={16} className="text-secondary/40 absolute right-6" />
                </button>
            </div>

            <button
                onClick={handleConfirm}
                className="w-full bg-primary text-onPrimary py-5 rounded-2xl font-bold text-xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition mt-4"
            >
                Confirm Time
            </button>
        </div>
    );

    const renderCalendar = () => (
        <div className="animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setView('overview')} className="p-2 -ml-2 text-secondary hover:bg-black/5 rounded-full transition">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-lg font-bold text-secondary font-display uppercase tracking-wide">
                    {displayMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex gap-1">
                    <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-black/5 text-secondary"><ChevronLeft size={24} /></button>
                    <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-black/5 text-secondary"><ChevronRight size={24} /></button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-xs font-bold text-secondary/40 uppercase py-2">{d}</div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {generateCalendarDays().map((day, i) => {
                    if (!day) return <div key={i}></div>;

                    const cellDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
                    const isSelected = cellDate.toDateString() === selectedDate.toDateString();
                    const isToday = cellDate.toDateString() === new Date().toDateString();

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
                                setSelectedDate(newDate);
                                setView('overview');
                            }}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition
                                ${isSelected ? 'bg-primary text-onPrimary shadow-md' : 'text-secondary hover:bg-black/5'}
                                ${isToday && !isSelected ? 'border-2 border-primary/30' : 'border border-transparent'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderTime = () => {
        const [currentH, currentM] = tempTime.split(':').map(Number);

        return (
            <div className="animate-in slide-in-from-right duration-300 h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <button onClick={() => setView('overview')} className="p-2 -ml-2 text-secondary hover:bg-black/5 rounded-full transition">
                        <ArrowLeft size={24} />
                    </button>
                    <h3 className="text-xl font-bold text-secondary font-display">Select Time</h3>
                    <div className="w-8"></div>
                </div>

                <div className="flex-1 flex gap-4 overflow-hidden relative">
                    {/* Hours Column */}
                    <div className="flex-1 flex flex-col relative">
                        <div className="text-center text-xs font-bold text-secondary/40 uppercase mb-2 sticky top-0 bg-surface z-10 py-2">Hours</div>
                        <div
                            ref={hoursRef}
                            onScroll={(e) => handleScroll(e, 'hours')}
                            className="overflow-y-auto no-scrollbar pb-32 pt-[calc(50%-28px)] snap-y snap-mandatory flex-1 mask-linear-fade"
                        >
                            {Array.from({ length: 24 }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        hoursRef.current?.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
                                    }}
                                    className={`
                                        snap-center w-full h-14 flex items-center justify-center text-2xl font-display font-bold transition-all
                                        ${currentH === i ? 'text-text-inverse scale-125' : 'text-secondary/30 scale-90'}
                                    `}
                                >
                                    {String(i).padStart(2, '0')}
                                </button>
                            ))}
                            <div className="h-[calc(50%-28px)]"></div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-black/5 my-12"></div>

                    {/* Minutes Column */}
                    <div className="flex-1 flex flex-col relative">
                        <div className="text-center text-xs font-bold text-secondary/40 uppercase mb-2 sticky top-0 bg-surface z-10 py-2">Minutes</div>
                        <div
                            ref={minutesRef}
                            onScroll={(e) => handleScroll(e, 'minutes')}
                            className="overflow-y-auto no-scrollbar pb-32 pt-[calc(50%-28px)] snap-y snap-mandatory flex-1"
                        >
                            {Array.from({ length: 12 }).map((_, i) => { // 5-min steps
                                const min = i * 5;
                                return (
                                    <button
                                        key={min}
                                        onClick={() => {
                                            minutesRef.current?.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
                                        }}
                                        className={`
                                        snap-center w-full h-14 flex items-center justify-center text-2xl font-display font-bold transition-all
                                        ${Math.abs(currentM - min) < 3 ? 'text-text-inverse scale-125' : 'text-secondary/30 scale-90'}
                                    `}
                                    >
                                        {String(min).padStart(2, '0')}
                                    </button>
                                )
                            })}
                            <div className="h-[calc(50%-28px)]"></div>
                        </div>
                    </div>

                    {/* Selection Indicator Overlay */}
                    <div className="absolute top-1/2 left-0 right-0 h-14 -translate-y-1/2 bg-primary/10 rounded-2xl pointer-events-none border border-primary/20 mt-4"></div>
                </div>

                <button
                    onClick={() => setView('overview')}
                    className="w-full bg-surface border-2 border-black/5 text-secondary py-4 rounded-2xl font-bold text-lg mt-4 shrink-0 hover:bg-black/5 transition"
                >
                    Set Time to {tempTime}
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-6 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-hidden min-h-[400px]" onClick={e => e.stopPropagation()}>
                {view === 'overview' && renderOverview()}
                {view === 'calendar' && renderCalendar()}
                {view === 'time' && renderTime()}
            </div>
        </div>
    );
}
