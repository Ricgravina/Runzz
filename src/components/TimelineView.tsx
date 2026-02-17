import { Zap, Utensils, Droplet, Dumbbell, Moon, Check, ChevronDown } from 'lucide-react';
import { TimelinePlan } from '../lib/recommendations';

interface TimelineViewProps {
    plan: TimelinePlan;
    checkedItems?: { [key: number]: boolean };
    expandedItems?: Set<number>;
    onToggleCheck?: (idx: number) => void;
    onToggleExpanded?: (idx: number) => void;
    readOnly?: boolean;
}

export default function TimelineView({
    plan,
    checkedItems = {},
    expandedItems = new Set(),
    onToggleCheck,
    onToggleExpanded,
    readOnly = false
}: TimelineViewProps) {
    return (
        <div className="relative">
            {/* Removed Vertical Line as requested */}

            {/* Group events by Day */}
            {(() => {
                const groups: { [key: string]: typeof plan.timeline } = {};
                plan.timeline.forEach(item => {
                    // Use _timestamp if available, otherwise fallback (though all should have it in final plan)
                    const date = new Date(item._timestamp || Date.now());
                    const key = date.toDateString(); // "Mon Feb 12 2024" - good enough for grouping
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                });

                // Sort keys just in case
                const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                return (
                    <div className="space-y-8">
                        {sortedKeys.map((dateKey) => {
                            const items = groups[dateKey];
                            const date = new Date(dateKey);
                            const today = new Date();
                            const tomorrow = new Date();
                            tomorrow.setDate(today.getDate() + 1);

                            let dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            if (date.toDateString() === today.toDateString()) dateLabel = "Today";
                            if (date.toDateString() === tomorrow.toDateString()) dateLabel = "Tomorrow";

                            // Calculate days before event
                            const eventItem = plan.timeline.find(item => item.label === "Start Time");
                            const eventDate = eventItem?._timestamp ? new Date(eventItem._timestamp) : null;
                            let dayLabel = "";

                            if (eventDate) {
                                // Calculate days difference (ignoring time)
                                const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                                const currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                const daysDiff = Math.round((eventDay.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24));

                                if (daysDiff === 0) {
                                    dayLabel = "EVENT DAY";
                                } else if (daysDiff > 0) {
                                    dayLabel = `T-${daysDiff} DAYS`;
                                } else {
                                    dayLabel = `T+${Math.abs(daysDiff)} DAYS`; // Post-event
                                }
                            }

                            return (
                                <div key={dateKey} className="relative">
                                    {/* Day Header */}
                                    <div className="sticky top-4 z-20 mb-2 mt-12 first:mt-0 flex items-center gap-4">
                                        <div className="bg-background/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm">
                                            <span className="text-text font-bold font-sans uppercase tracking-wider text-xs">
                                                {dateLabel}
                                            </span>
                                        </div>
                                        {dayLabel && (
                                            <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30">
                                                <span className="text-text-inverse font-bold font-sans uppercase tracking-wider text-[10px]">
                                                    {dayLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div className="h-px bg-black/5 flex-1"></div>
                                    </div>

                                    {/* Daily Items Card */}
                                    <div className="bg-surface rounded-[2.5rem] p-8 border border-black/5 shadow-sm">
                                        <div className="space-y-8">
                                            {items.map((item) => {
                                                // We need the original index for toggling check state
                                                const originalIdx = plan.timeline.indexOf(item);

                                                const isCompleted = checkedItems[originalIdx] || item.status === 'completed' || false;
                                                const isActive = item.status === 'active';
                                                const isExpanded = expandedItems.has(originalIdx);

                                                // Icon Mapping based on type
                                                let Icon = Zap;
                                                if (item.type === 'nutrition') Icon = Utensils;
                                                if (item.type === 'hydration') Icon = Droplet;
                                                if (item.type === 'training') Icon = Dumbbell;
                                                if (item.type === 'recovery') Icon = Moon;

                                                return (
                                                    <div key={originalIdx}
                                                        className={`relative transition-all duration-300 group select-none ${isCompleted ? 'opacity-40 grayscale' : 'opacity-100'} mb-8 last:mb-0 border-b border-black/5 last:border-0 pb-8 last:pb-0`}
                                                    >

                                                        {/* Main Content */}
                                                        <div
                                                            onClick={() => onToggleExpanded && onToggleExpanded(originalIdx)}
                                                            className={onToggleExpanded ? "cursor-pointer" : ""}
                                                        >
                                                            <div className="flex items-center justify-between pointer-events-none mb-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition box-content ${isCompleted
                                                                            ? 'bg-success border-success text-white'
                                                                            : isActive
                                                                                ? 'bg-primary border-primary text-onPrimary'
                                                                                : item.type === 'nutrition'
                                                                                    ? 'bg-secondary border-transparent text-primary'  // Dark Green + Lime Icon
                                                                                    : item.type === 'hydration'
                                                                                        ? 'bg-blue-100 border-blue-100 text-blue-600'     // Light Blue + Dark Blue
                                                                                        : item.type === 'training'
                                                                                            ? 'bg-text border-text text-background'           // Black + Cream
                                                                                            : 'bg-surface border-black/10 text-secondary'         // Default (Cream + Dark Green)
                                                                            }`}
                                                                    >
                                                                        {isCompleted ? <Check size={12} strokeWidth={4} /> : <Icon size={12} />}
                                                                    </div>

                                                                    <span className={`text-xs font-bold font-sans tracking-tight ${isActive ? 'text-secondary' : 'text-text-inverse/60'}`}>
                                                                        {item.timeMarkup}
                                                                    </span>
                                                                    {/* Risk Indicator */}
                                                                    {item.riskLevel && item.riskLevel !== 'low' && (
                                                                        <div className={`w-2 h-2 rounded-full ${item.riskLevel === 'high' ? 'bg-error animate-pulse' : 'bg-orange-400'}`} title={`Risk: ${item.riskLevel}`}></div>
                                                                    )}
                                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider font-sans font-bold ${item.type === 'nutrition' ? 'bg-secondary/10 text-secondary' :
                                                                        item.type === 'training' ? 'bg-primary/20 text-text-inverse' :
                                                                            'bg-black/5 text-text-inverse/60'
                                                                        }`}>
                                                                        {item.label}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start justify-between gap-4">
                                                                <h3 className={`text-lg font-bold leading-snug transition-all font-display tracking-tight ${isCompleted ? 'text-text-inverse/50 line-through decoration-text-inverse/30' : 'text-text-inverse'}`}>
                                                                    {item.title}
                                                                </h3>
                                                                {onToggleExpanded && (
                                                                    <div className={`transition-transform duration-300 transform mt-1 ${isExpanded ? 'rotate-180 text-secondary' : 'rotate-0 text-text-inverse/30'}`}>
                                                                        <ChevronDown size={20} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Expandable Details */}
                                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded || readOnly ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                                                <div className="overflow-hidden">
                                                                    <div className="pt-3 pb-2">
                                                                        {item.details.map((detail, dIdx) => {
                                                                            const splitIndex = detail.indexOf(': ');
                                                                            if (splitIndex !== -1) {
                                                                                const title = detail.substring(0, splitIndex);
                                                                                const content = detail.substring(splitIndex + 2);
                                                                                return (
                                                                                    <div key={dIdx} className="mb-3 last:mb-0">
                                                                                        <span className="font-bold text-secondary text-[10px] uppercase tracking-wider block mb-1 font-sans">{title}</span>
                                                                                        <span className="block text-sm text-text-inverse/80 leading-relaxed font-medium">{content}</span>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <p key={dIdx} className="text-sm text-text-inverse/80 mb-2 last:mb-0 leading-relaxed font-medium">
                                                                                    {detail}
                                                                                </p>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Manual Complete Button (Only if not Read Only) */}
                                                                    {!readOnly && !isCompleted && onToggleCheck && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onToggleCheck(originalIdx);
                                                                            }}
                                                                            className="mt-4 flex items-center gap-2 bg-background hover:bg-black/5 text-text text-xs font-sans font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition border border-black/5"
                                                                        >
                                                                            <Check size={14} />
                                                                            Mark Complete
                                                                        </button>
                                                                    )}
                                                                    {isCompleted && (
                                                                        <div className="mt-3 text-success text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-2 opacity-80">
                                                                            <Check size={14} /> Completed
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
}
