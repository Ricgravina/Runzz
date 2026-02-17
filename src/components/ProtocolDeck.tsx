import { useRef, useEffect, useState } from 'react';
import { TimelinePlan } from '../lib/recommendations';
import { Check, Zap, Utensils, Droplet, Dumbbell, Moon, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProtocolDeckProps {
    plan: TimelinePlan;
    checkedItems: { [key: number]: boolean };
    onToggleCheck: (idx: number) => void;
    onEnd?: () => void;
}

export default function ProtocolDeck({ plan, checkedItems, onToggleCheck, onEnd }: ProtocolDeckProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const scrollToCard = (index: number) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const cards = container.children;
            if (cards[index]) {
                const card = cards[index] as HTMLElement;
                const scrollLeft = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    };

    // Auto-scroll to first incomplete item on load
    useEffect(() => {
        let targetIdx = plan.timeline.findIndex((item, idx) => {
            const isCompleted = checkedItems[idx] || item.status === 'completed';
            return !isCompleted;
        });
        if (targetIdx === -1) targetIdx = plan.timeline.length; // Go to End card if all done (or last)

        // Initial scroll
        setTimeout(() => scrollToCard(targetIdx), 100);
    }, []);

    // Track active card via IntersectionObserver
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveIndex(index);
                    }
                });
            },
            {
                root: container,
                threshold: 0.5,
            }
        );

        Array.from(container.children).forEach((child) => observer.observe(child));

        return () => observer.disconnect();
    }, [plan.timeline]);



    // Group events by Day
    const days = plan.timeline.reduce((acc, item) => {
        const date = new Date(item._timestamp || Date.now());
        const key = date.toDateString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as { [key: string]: typeof plan.timeline });

    const sortedDates = Object.keys(days).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Auto-scroll to Today or first incomplete day
    useEffect(() => {
        // Find first day with an incomplete task
        let targetDayIndex = sortedDates.findIndex(dateKey => {
            const items = days[dateKey];
            return items.some(item => {
                const idx = plan.timeline.indexOf(item);
                return !checkedItems[idx] && item.status !== 'completed';
            });
        });

        if (targetDayIndex === -1) targetDayIndex = 0; // Default to first day if all active done

        // Initial scroll
        setTimeout(() => scrollToCard(targetDayIndex), 100);
    }, []); // Run once on mount

    // Track active card via IntersectionObserver
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveIndex(index);
                    }
                });
            },
            {
                root: container,
                threshold: 0.5,
            }
        );

        Array.from(container.children).forEach((child) => observer.observe(child));

        return () => observer.disconnect();
    }, [sortedDates.length]);

    const handleToggle = (idx: number) => {
        onToggleCheck(idx);
    };

    return (
        <div className="flex flex-col w-full h-[80vh]">

            {/* --- DATE STRIP (Top) --- */}
            <div className="mb-6 relative w-full">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-4 snap-x px-4">
                    {sortedDates.map((dateKey, idx) => {
                        const date = new Date(dateKey);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W
                        const dayNum = date.getDate();
                        const isActive = idx === activeIndex;
                        const hasIncomplete = days[dateKey].some(item => !checkedItems[plan.timeline.indexOf(item)] && item.status !== 'completed');

                        return (
                            <button
                                key={dateKey}
                                onClick={() => scrollToCard(idx)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[3.5rem] h-[5rem] rounded-[1.5rem] transition-all duration-300 snap-start border",
                                    isActive
                                        ? "bg-primary text-black border-primary shadow-lg scale-110"
                                        : "bg-surface/50 text-text-inverse border-white/5 hover:bg-white/5"
                                )}
                            >
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60")}>{dayName}</span>
                                <span className="text-xl font-display font-bold leading-none">{dayNum}</span>
                                {hasIncomplete && !isActive && <div className="w-1 h-1 bg-primary rounded-full mt-2"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- SWIPEABLE DECK (Days) --- */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full gap-4 px-[5vw] pb-8 items-start"
            >
                {sortedDates.map((dateKey, idx) => {
                    const items = days[dateKey];
                    const isActive = idx === activeIndex;

                    return (
                        <div
                            key={dateKey}
                            data-index={idx}
                            className="min-w-[90vw] snap-center flex justify-center h-full"
                        >
                            <div className={cn(
                                "w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-300 border flex flex-col bg-surface backdrop-blur-md shadow-xl",
                                isActive ? "opacity-100 border-primary/20 scale-100" : "opacity-50 border-white/5 scale-95"
                            )}>

                                {/* Card Header */}
                                <div className="p-6 pb-2 border-b border-white/5">
                                    <h3 className="text-2xl font-display font-bold text-text-inverse uppercase tracking-tight">
                                        {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' })}
                                    </h3>
                                    <div className="text-secondary font-bold font-sans text-sm uppercase tracking-wider opacity-80">
                                        {new Date(dateKey).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                {/* Activity List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {items.map((item) => {
                                        const originalIdx = plan.timeline.indexOf(item);
                                        const isCompleted = checkedItems[originalIdx] || item.status === 'completed';

                                        let Icon = Zap;
                                        if (item.type === 'nutrition') Icon = Utensils;
                                        if (item.type === 'hydration') Icon = Droplet;
                                        if (item.type === 'training') Icon = Dumbbell;
                                        if (item.type === 'recovery') Icon = Moon;

                                        return (
                                            <div
                                                key={originalIdx}
                                                onClick={() => handleToggle(originalIdx)}
                                                className={cn(
                                                    "p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border cursor-pointer active:scale-[0.98]",
                                                    isCompleted
                                                        ? "bg-black/5 border-transparent opacity-50 grayscale"
                                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                                )}
                                            >
                                                {/* Checkbox / Icon */}
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors border-2",
                                                    isCompleted
                                                        ? "bg-transparent border-success/50 text-success"
                                                        : "bg-black/20 border-transparent text-secondary"
                                                )}>
                                                    {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-inverse/60">{item.timeMarkup}</span>
                                                        <span className={cn(
                                                            "text-[9px] px-1.5 py-0.5 rounded ml-2 uppercase font-bold tracking-wide",
                                                            item.type === 'training' ? "bg-primary/20 text-primary" : "bg-white/10 text-text-inverse/50"
                                                        )}>{item.label}</span>
                                                    </div>
                                                    <h4 className={cn(
                                                        "text-lg font-bold font-display leading-tight truncate",
                                                        isCompleted ? "text-text-inverse/50 line-through" : "text-text-inverse"
                                                    )}>{item.title}</h4>

                                                    {/* Details List */}
                                                    {item.details && item.details.length > 0 && (
                                                        <ul className="mt-3 space-y-2 border-t border-white/10 pt-2">
                                                            {item.details.map((detail, dIdx) => (
                                                                <li key={dIdx} className="text-sm text-text-inverse/80 font-sans leading-relaxed flex items-start gap-2">
                                                                    <span className="opacity-50 mt-1.5 w-1 h-1 bg-current rounded-full shrink-0" />
                                                                    <span>{detail}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* END CARD */}
                <div
                    data-index={sortedDates.length}
                    className="min-w-[90vw] snap-center flex justify-center h-full"
                >
                    <div className="w-full h-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center bg-surface border border-white/10 text-center">
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-primary">
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-text-inverse mb-4 uppercase">All Set!</h2>
                        <p className="text-text-inverse/60 mb-8 max-w-xs leading-relaxed">You've reached the end of the timeline.</p>
                        <button
                            onClick={onEnd}
                            className="w-full bg-primary text-onPrimary py-5 rounded-2xl font-bold uppercase tracking-wider text-lg hover:scale-105 transition-transform"
                        >
                            Finish Protocol
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );

}
