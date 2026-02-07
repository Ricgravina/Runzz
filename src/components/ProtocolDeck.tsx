import { useRef, useEffect, useState } from 'react';
import { TimelinePlan } from '../lib/recommendations';
import { Check, Zap, Utensils, Droplet, Dumbbell, Moon, Clock, Trophy, Flag } from 'lucide-react';
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

    const handleToggle = (idx: number) => {
        const isNowChecked = !checkedItems[idx];
        onToggleCheck(idx);

        if (isNowChecked) {
            setTimeout(() => scrollToCard(idx + 1), 300);
        }
    };

    // Header Logic
    const isEndCard = activeIndex === plan.timeline.length;
    const activeItem = isEndCard ? {
        title: "Session Complete",
        timeMarkup: "Finish",
    } : (plan.timeline[activeIndex] || plan.timeline[0]);

    return (
        <div className="flex flex-col w-full">

            {/* --- FIXED HEADER (Grounded Context) --- */}
            <div className="px-6 mb-4 flex flex-col items-center text-center animate-in fade-in duration-300 transform transition-all" key={activeIndex}>
                <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest mb-2 border",
                    isEndCard ? "bg-primary/20 text-primary border-primary/20" : "bg-white/10 text-white border-white/10"
                )}>
                    {isEndCard ? <Flag size={12} /> : <Clock size={12} />}
                    {activeItem.timeMarkup}
                </div>
                <h2 className={cn(
                    "text-3xl font-display font-bold uppercase tracking-tight leading-none transition-colors",
                    isEndCard ? "text-primary" : "text-white"
                )}>
                    {activeItem.title}
                </h2>
            </div>

            {/* --- SCROLLABLE DECK --- */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-[60vh] w-full gap-4 px-[10vw] py-16 items-center"
            >
                {plan.timeline.map((item, idx) => {
                    const isCompleted = checkedItems[idx] || item.status === 'completed';
                    // Active logic purely for styling inside the deck
                    const isActive = idx === activeIndex;

                    let Icon = Zap;
                    if (item.type === 'nutrition') Icon = Utensils;
                    if (item.type === 'hydration') Icon = Droplet;
                    if (item.type === 'training') Icon = Dumbbell;
                    if (item.type === 'recovery') Icon = Moon;

                    return (
                        <div
                            key={idx}
                            data-index={idx}
                            className="min-w-[80vw] snap-center flex justify-center py-2"
                        >
                            <div className={cn(
                                "w-full h-full rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden transition-all duration-300 border backdrop-blur-sm",
                                isActive ? "bg-primary text-black border-primary shadow-2xl shadow-primary/30 scale-105 z-10" :
                                    isCompleted ? "bg-surface text-text-dim border-black/5 opacity-60 scale-95 grayscale" :
                                        "bg-surface text-text border-black/5 shadow-lg scale-95 opacity-80"
                            )}>

                                {/* Icon Header (Inside Card) */}
                                <div className="flex justify-center mb-6">
                                    <div className={cn(
                                        "p-4 rounded-full",
                                        isActive ? "bg-black/10 text-black" : "bg-black/5 text-secondary"
                                    )}>
                                        <Icon size={32} />
                                    </div>
                                </div>

                                {/* Content (Details Only) */}
                                <div className="flex-1 overflow-y-auto no-scrollbar mask-image-b text-center">
                                    <div className="space-y-4">
                                        {item.details.map((detail, dIdx) => {
                                            const splitIndex = detail.indexOf(': ');
                                            if (splitIndex !== -1) {
                                                const title = detail.substring(0, splitIndex);
                                                const content = detail.substring(splitIndex + 2);
                                                return (
                                                    <div key={dIdx}>
                                                        <span className={cn(
                                                            "type-label block mb-1",
                                                            isActive ? "text-black/60" : "text-secondary"
                                                        )}>{title}</span>
                                                        <span className={cn(
                                                            "block text-xl leading-snug font-medium",
                                                            isActive ? "text-black" : "text-text-inverse"
                                                        )}>{content}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <p key={dIdx} className={cn(
                                                    "text-lg leading-snug font-medium",
                                                    isActive ? "text-black" : "text-text-inverse"
                                                )}>
                                                    {detail}
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => handleToggle(idx)}
                                    className={cn(
                                        "mt-6 w-full py-5 rounded-2xl font-display font-bold text-xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95",
                                        isCompleted
                                            ? "bg-black/5 text-text-dim border-transparent"
                                            : isActive
                                                ? "bg-black text-white shadow-xl hover:bg-black/80" // High contrast on active (Lime) card
                                                : "bg-primary text-black shadow-lg"
                                    )}
                                >
                                    {isCompleted ? (
                                        <>
                                            <Check size={24} strokeWidth={3} />
                                            Completed
                                        </>
                                    ) : (
                                        "Mark Complete"
                                    )}
                                </button>

                            </div>
                        </div>
                    );
                })}

                {/* --- END CARD --- */}
                <div
                    data-index={plan.timeline.length}
                    className="min-w-[80vw] snap-center flex justify-center py-2"
                >
                    <div className={cn(
                        "w-full h-full rounded-[2.5rem] p-6 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 border backdrop-blur-sm bg-surface/90 border-white/10",
                        isEndCard ? "scale-105 z-10 shadow-2xl" : "scale-95 opacity-60"
                    )}>
                        <div className="bg-primary/20 p-6 rounded-full text-primary mb-6 animate-pulse">
                            <Trophy size={48} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-text-inverse mb-2 uppercase tracking-tight">All Done</h3>
                        <p className="text-secondary text-center mb-8 px-4">You've completed every step of the protocol.</p>

                        <button
                            onClick={onEnd}
                            className="w-full bg-primary text-black font-display font-bold text-xl py-5 rounded-2xl uppercase tracking-wider shadow-lg hover:scale-105 transition-transform"
                        >
                            Finish Session
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
