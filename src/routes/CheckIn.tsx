import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap, Check, MessageCircle, Utensils, Moon, Pencil, ChevronDown, MoreVertical, X, Dumbbell } from 'lucide-react';
import { saveLog, LogEntry, getLogs, updateLog, getProfile, completeSession } from '../lib/storage';
import { generateTimeline, TimelinePlan } from '../lib/recommendations';
import CountdownTimer from '../components/CountdownTimer';
import TimelineView from '../components/TimelineView';
import DateTimePickerSheet from '../components/DateTimePickerSheet';
import ProtocolDeck from '../components/ProtocolDeck';
import ProtocolOverview from '../components/ProtocolOverview';

type Step = 'context' | 'gut' | 'plan';

export default function CheckIn() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('editId');

    const [step, setStep] = useState<Step>(editId ? 'gut' : 'context');


    // Custom Inputs State
    const [customStartTime, setCustomStartTime] = useState<string>(''); // HH:MM
    const [customDuration, setCustomDuration] = useState<string>(''); // minutes


    const [sessionTime, setSessionTime] = useState<LogEntry['sessionTime'] | 'custom' | null>(null);
    const [sessionTitle, setSessionTitle] = useState('');
    const [intensity, setIntensity] = useState<LogEntry['intensity'] | null>(null);
    const [duration, setDuration] = useState<LogEntry['duration'] | 'custom' | null>(null);
    const [gutScale, setGutScale] = useState<number>(8);
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [prepLeadTime, setPrepLeadTime] = useState<number>(3); // Default 3 days

    // Travel State
    const [isTraveling, setIsTraveling] = useState(false);
    const [travelMode, setTravelMode] = useState<'flight' | 'drive' | 'train' | 'other'>('flight');
    const [travelStartTime, setTravelStartTime] = useState('');
    const [travelDuration, setTravelDuration] = useState('');

    const [finalPlan, setFinalPlan] = useState<TimelinePlan | null>(null);
    const [loading, setLoading] = useState(false);

    // UI State for Live Mode
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [gutScaleModalCompat, setGutScaleModalCompat] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [durationSheetOpen, setDurationSheetOpen] = useState(false);
    const [dateSheetOpen, setDateSheetOpen] = useState(false);

    // Loading Animation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [genStep, setGenStep] = useState(0);
    const genMessages = [
        "Analyzing Biometrics...",
        "Checking Gut State...",
        "Retrieving Weather...",
        "Optimizing Nutrition...",
        "Finalizing Protocol..."
    ];

    const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0])); // Default first item expanded
    const [lastUpdateParams, setLastUpdateParams] = useState<string | null>(null);

    // --- HELPER: Calc Max Lead Time ---
    const getMaxLeadTime = () => {
        if (!customStartTime) return 14; // Default to max available (was 3)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Local Midnight
        const target = new Date(customStartTime);
        target.setHours(0, 0, 0, 0); // Local Midnight target

        const diffTime = target.getTime() - now.getTime();
        const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.min(14, days));
    };

    const maxLeadTime = getMaxLeadTime();

    // Auto-clamp removed to allow full protocol generation
    // useEffect(() => {
    //     if (prepLeadTime > maxLeadTime) {
    //         setPrepLeadTime(maxLeadTime);
    //     }
    // }, [customStartTime, maxLeadTime]);

    const toggleCheck = (idx: number) => {
        setCheckedItems(prev => {
            const isNowChecked = !prev[idx];

            // Auto-expand next item if verifying
            if (isNowChecked && finalPlan) {
                if (idx + 1 < finalPlan.timeline.length) {
                    setExpandedItems(e => {
                        const next = new Set(e);
                        next.add(idx + 1);
                        return next;
                    });
                }
            }

            return { ...prev, [idx]: isNowChecked };
        });
    };

    const toggleExpanded = (idx: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    useEffect(() => {
        if (editId) {
            const logs = getLogs();
            const target = logs.find(l => l.id === editId);
            if (target) {
                // Lock Completed Protocols
                if (target.status === 'completed') {
                    navigate(target.feedback ? `/history` : `/feedback/${editId}`);
                    return;
                }

                setSessionTime(target.sessionTime);
                setSessionTitle(target.title || '');
                setIntensity(target.intensity);
                setDuration(target.duration);
                setGutScale(target.gutScale);
                setSymptoms(target.symptoms);
                setPrepLeadTime(target.leadTimeDays || 3); // Restore lead time

                let targetTimeMs = Date.now();
                let offsetMinutes = 0;
                let durationMins = 90;

                // Restore Duration Logic for Recalculation
                if (target.duration === 'short') durationMins = 45;
                if (target.duration === 'medium') durationMins = 90;
                if (target.duration === 'long') durationMins = 180;
                if (target.duration === 'ultra') durationMins = 240;

                // Restore Custom Time if available
                if (target.targetStartTime) {
                    setSessionTime('custom');
                    targetTimeMs = target.targetStartTime;
                    offsetMinutes = Math.round((targetTimeMs - Date.now()) / 60000);

                    // Format for input
                    const d = new Date(target.targetStartTime);
                    const offset = d.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                    setCustomStartTime(localISOTime);
                }

                const profile = getProfile();

                // Generate Plan Immediately                }

                // Always regenerate the plan to apply latest fixes (e.g., 14-day protocol fix)
                const plan = generateTimeline(
                    target.sessionTime,
                    target.intensity,
                    target.duration,
                    target.gutScale,
                    target.symptoms,
                    logs,
                    Date.now(),
                    offsetMinutes,
                    durationMins,
                    profile,
                    target.travel,
                    target.leadTimeDays || 3 // Use saved value directly to avoid stale state closure
                );

                setFinalPlan(plan);

                // Update the saved protocol with the new plan
                updateLog(editId, { plan });

                setStep('plan'); // Direct to plan view
            }
        }
    }, [editId]);

    const handleNext = () => {
        if (step === 'context') {
            // Validate Inputs
            if (sessionTime === 'custom' && customStartTime) {
                if (new Date(customStartTime).getTime() < Date.now()) {
                    alert("Please select a future time.");
                    return;
                }
            }
            if (sessionTime === 'custom' && !customStartTime) return;
            if (duration === 'custom' && !customDuration) return;

            if (intensity && (duration || customDuration)) {
                setStep('gut');
            }
        }
        else if (step === 'gut') {
            setShowAddEvent(false); // Ensure overlay is closed
            setIsGenerating(true);
            setGenStep(0);

            // Cycle messages every 1 second
            const interval = setInterval(() => {
                setGenStep(s => (s < genMessages.length - 1 ? s + 1 : s));
            }, 1000);

            // Execute logic after 5 seconds
            setTimeout(() => {
                clearInterval(interval);
                setIsGenerating(false);
                const allLogs = getLogs();
                const profile = getProfile();
                const safeIntensity = intensity || 'max_effort';

                // Resolve duration for storage/logic
                let finalDuration: LogEntry['duration'] = 'medium';
                let durationMins = 90;

                if (duration === 'custom') {
                    durationMins = parseInt(customDuration);
                    if (durationMins < 60) finalDuration = 'short';
                    else if (durationMins < 120) finalDuration = 'medium';
                    else if (durationMins < 240) finalDuration = 'long';
                    else finalDuration = 'ultra';
                } else {
                    finalDuration = duration as LogEntry['duration'];
                    if (finalDuration === 'short') durationMins = 45;
                    if (finalDuration === 'medium') durationMins = 90;
                    if (finalDuration === 'long') durationMins = 180;
                    if (finalDuration === 'ultra') durationMins = 240;
                }

                // Calculate Start Offset and Target Time
                let targetTimeMs = Date.now();
                let offsetMinutes = 0;

                if (sessionTime === 'custom' || customStartTime) {
                    targetTimeMs = new Date(customStartTime).getTime();
                    offsetMinutes = Math.round((targetTimeMs - Date.now()) / 60000);
                } else if (sessionTime === '1hr') {
                    offsetMinutes = 60;
                    targetTimeMs = Date.now() + 60 * 60000;
                } else if (sessionTime === '2hr+') {
                    offsetMinutes = 120;
                    targetTimeMs = Date.now() + 120 * 60000;
                }

                // Get current log to retrieve existing events if editing
                const currentLog = editId ? getLogs().find(l => l.id === editId) : null;
                const adhocEvents = currentLog?.adhocEvents || [];

                // Create a temporary profile object that includes the ad-hoc events
                const profileWithEvents = { ...profile!, adhocEvents } as any;

                const plan = generateTimeline(
                    sessionTime === 'custom' ? '2hr+' : sessionTime!,
                    safeIntensity,
                    finalDuration,
                    gutScale,
                    symptoms,
                    allLogs,
                    Date.now(),
                    offsetMinutes,
                    durationMins,
                    profileWithEvents,
                    isTraveling ? {
                        isTraveling: true,
                        mode: travelMode,
                        startTime: new Date(travelStartTime).getTime(),
                        durationMinutes: parseInt(travelDuration) * 60
                    } : undefined,
                    prepLeadTime
                );
                console.log("DEBUG: generateTimeline called with", { prepLeadTime, plan });

                setFinalPlan(plan);
                setLoading(false);
                setStep('plan');

                if (editId) {
                    const logData = {
                        title: sessionTitle || undefined,
                        sessionTime: sessionTime === 'custom' ? '2hr+' : sessionTime!,
                        intensity: safeIntensity,
                        duration: finalDuration,
                        gutScale,
                        symptoms,
                        plan,
                        targetStartTime: targetTimeMs,
                        travel: isTraveling ? {
                            isTraveling: true,
                            mode: travelMode,
                            startTime: new Date(travelStartTime).getTime(),
                            durationMinutes: parseInt(travelDuration) * 60
                        } : undefined,
                        leadTimeDays: prepLeadTime
                    };
                    updateLog(editId, logData);
                }
            }, 5000); // 5 Second Delay
        }
    };

    // Back Button Logic Helper
    const handleBack = () => {
        if (editId) {
            // Active Session -> Go Home
            navigate('/');
        } else {
            // New Setup -> Logic
            if (step === 'context') navigate('/');
            else setStep(prev => prev === 'plan' ? 'gut' : 'context');
        }
    };

    const commonSymptomList = ['Urgency', 'Bloating', 'Pain', 'Nausea', 'Fatigue'];
    const toggleSymptom = (s: string) => {
        setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans text-text bg-background">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div className="flex items-center gap-3">
                    {/* Always Show Back Button */}
                    {true && (
                        <button
                            onClick={handleBack}
                            className="bg-surface p-3 rounded-full text-secondary hover:text-text hover:bg-black/5 transition shadow-sm border border-black/5"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <h1 className="text-3xl font-bold text-text leading-none font-display uppercase tracking-tight">
                        {step === 'context' && (editId ? "Edit Setup" : "Setup")}
                        {step === 'gut' && "Gut Check"}
                        {step === 'plan' && "Protocol"}
                    </h1>
                </div>

                {/* Edit Icon for Active Protocols */}
                {step === 'plan' && editId && (
                    <div className="relative z-50">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="bg-surface p-3 rounded-full text-text-inverse hover:bg-black/5 transition flex items-center gap-2 shadow-sm border border-black/5"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                                <div className="absolute right-0 top-12 w-48 bg-surface rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={() => { setShowAddEvent(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-black/5 text-sm font-medium text-text flex items-center gap-2"
                                    >
                                        <Dumbbell size={16} /> Log Workout
                                    </button>
                                    <button
                                        onClick={() => { setStep('context'); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-black/5 text-sm font-medium text-text flex items-center gap-2"
                                    >
                                        <Pencil size={16} /> Edit Setup
                                    </button>
                                    <button
                                        onClick={() => { setShowEndConfirm(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-error/10 text-sm font-medium text-error flex items-center gap-2"
                                    >
                                        <X size={16} /> End Protocol
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col">

                {/* ADD WORKOUT MODAL */}
                {showAddEvent && (
                    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddEvent(false)}>
                        <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-secondary font-display">Log Workout</h3>
                                <button onClick={() => setShowAddEvent(false)} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-2 block">Notes / Details</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 30min Recovery Run"
                                        className="w-full bg-background border border-black/5 rounded-xl p-4 text-text placeholder:text-text/30 text-lg outline-none focus:border-primary transition"
                                        id="workout-details"
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        const details = (document.getElementById('workout-details') as HTMLInputElement).value;
                                        if (editId) {
                                            const logs = getLogs();
                                            const target = logs.find(l => l.id === editId);
                                            if (target) {
                                                const newEvent = {
                                                    id: crypto.randomUUID(),
                                                    type: 'workout' as const,
                                                    timestamp: Date.now(),
                                                    detail: details || "Manual Log"
                                                };
                                                const updatedAdhoc = [...(target.adhocEvents || []), newEvent];

                                                // Update and Regenerate
                                                updateLog(editId, { adhocEvents: updatedAdhoc });

                                                // Trigger regeneration by refreshing local state
                                                // Quickest way is to force re-run of useEffect by toggling a dummy state or just calling init logic
                                                // Let's just close modal and let user pull down or rely on next render if we update state locally too?
                                                // Better: updateLog persists, but we need to update 'finalPlan' in view.
                                                // Re-running the generation logic locally:
                                                const profile = getProfile();
                                                const profileWithEvents = { ...profile!, adhocEvents: updatedAdhoc } as any;

                                                // Re-calc offset just in case
                                                let offsetMinutes = 0;
                                                if (target.targetStartTime) {
                                                    offsetMinutes = Math.round((target.targetStartTime - Date.now()) / 60000);
                                                }

                                                const newPlan = generateTimeline(
                                                    target.sessionTime,
                                                    target.intensity,
                                                    target.duration,
                                                    target.gutScale,
                                                    target.symptoms,
                                                    logs,
                                                    Date.now(),
                                                    offsetMinutes,
                                                    90, // approx
                                                    profileWithEvents,
                                                    target.travel,
                                                    target.leadTimeDays || 3
                                                );
                                                setFinalPlan(newPlan);
                                            }
                                        }
                                        setShowAddEvent(false);
                                    }}
                                    className="w-full bg-primary text-onPrimary font-bold text-lg py-4 rounded-xl uppercase tracking-wider shadow-lg hover:brightness-110 transition"
                                >
                                    Log Activity
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {isGenerating && (
                    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                        {/* Pulse Ring */}
                        <div className="relative mb-12">
                            <div className="w-32 h-32 rounded-full border-4 border-primary/20 animate-ping absolute inset-0"></div>
                            <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center relative bg-background shadow-[0_0_40px_theme(colors.primary.DEFAULT)]">
                                <Zap size={48} className="text-primary animate-pulse" fill="currentColor" />
                            </div>
                        </div>

                        {/* Text Cycle */}
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl font-bold font-display text-text uppercase tracking-tight animate-pulse">
                                {genMessages[genStep]}
                            </h2>
                            <div className="w-64 h-2 bg-black/20 rounded-full overflow-hidden mx-auto mt-8">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                                    style={{ width: `${((genStep + 1) / genMessages.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STEP 1: CONTEXT --- */}
                {step === 'context' && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">

                        {/* 1. TIMING */}
                        <div>
                            <div className="text-white/60 type-label mb-3">Event Timing</div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {[0, 1, 7, 14].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            const date = new Date();
                                            date.setDate(date.getDate() + d);
                                            const timePart = customStartTime ? customStartTime.split('T')[1] : "09:00";
                                            // Local safe ISO date construction
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const isoDate = `${year}-${month}-${day}`;

                                            setCustomStartTime(`${isoDate}T${timePart}`);
                                            setSessionTime('custom');
                                        }}
                                        className={`py-4 rounded-2xl type-label-lg transition border-2 ${customStartTime && new Date(customStartTime).getDate() === new Date(Date.now() + d * 86400000).getDate()
                                            ? 'bg-primary border-primary text-onPrimary shadow-md'
                                            : 'bg-surface border-transparent text-secondary hover:border-black/5'
                                            }`}
                                    >
                                        {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === 7 ? 'In 1 Week' : 'In 2 Weeks'}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-surface rounded-2xl p-4 flex items-center gap-3 border border-black/5 shadow-sm">

                                <button
                                    onClick={() => setDateSheetOpen(true)}
                                    className={`text-lg font-medium flex-1 text-left font-sans ${customStartTime ? 'text-text-inverse' : 'text-text-inverse/50'}`}
                                >
                                    {customStartTime ? new Date(customStartTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Set Time...'}
                                </button>
                            </div>

                            <DateTimePickerSheet
                                isOpen={dateSheetOpen}
                                onClose={() => setDateSheetOpen(false)}
                                initialValue={customStartTime}
                                onSelect={(iso) => {
                                    setCustomStartTime(iso);
                                    setSessionTime('custom');
                                }}
                            />
                        </div>


                        {/* 1.5 NAME (Optional) */}
                        <div>
                            <div className="text-white/60 type-label mb-3">Event Name (Optional)</div>
                            <input
                                type="text"
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                                placeholder="e.g. Sunday Long Run"
                                className="w-full bg-surface text-text-inverse text-lg font-medium p-5 rounded-2xl outline-none placeholder-text-inverse/50 border border-black/5 focus:border-primary transition shadow-sm"
                            />
                        </div>

                        {/* 2. DURATION */}
                        <div className="relative">
                            <div className="text-white/60 type-label mb-3">Duration</div>
                            <button
                                onClick={() => setDurationSheetOpen(true)}
                                className={`w-full py-5 rounded-2xl type-label-lg transition flex items-center justify-center gap-4 px-6 border-2 relative ${duration
                                    ? 'bg-primary border-primary text-onPrimary shadow-md'
                                    : 'bg-surface border-transparent text-text-inverse hover:border-black/5'
                                    }`}
                            >
                                <span>{duration ? (duration === 'custom' ? `${customDuration} mins` : duration === 'short' ? '45 mins' : duration === 'medium' ? '90 mins' : duration === 'long' ? '3 hrs' : '4 hrs') : 'Select Duration'}</span>
                                <ChevronDown size={20} className={duration ? 'text-onPrimary' : 'text-text-inverse'} />
                            </button>

                            {/* Duration Action Sheet */}
                            {durationSheetOpen && (
                                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDurationSheetOpen(false)}>
                                    <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-secondary font-display">Select Duration</h3>
                                            <button onClick={() => setDurationSheetOpen(false)} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text transition">
                                                <span className="sr-only">Close</span>
                                                <ChevronDown size={24} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {[
                                                { label: '45m', val: '45', id: 'short' },
                                                { label: '90m', val: '90', id: 'medium' },
                                                { label: '3h', val: '180', id: 'long' },
                                                { label: '4h', val: '240', id: 'ultra' },
                                            ].map(opt => {
                                                const isActive = duration === opt.id as any;
                                                return (
                                                    <button
                                                        key={opt.val}
                                                        onClick={() => {
                                                            setCustomDuration(opt.val);
                                                            setDuration(opt.id as any);
                                                            setDurationSheetOpen(false);
                                                        }}
                                                        className={`py-6 rounded-2xl border-2 text-lg font-bold transition flex flex-col items-center justify-center gap-1 ${isActive
                                                            ? 'bg-primary border-primary text-onPrimary shadow-md'
                                                            : 'bg-surface border-transparent text-secondary hover:bg-surface hover:border-black/5'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-4 border-t border-black/5">
                                            <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-2 block">Custom (Minutes)</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 60"
                                                    className="w-full bg-white/50 border border-black/5 rounded-xl p-3 text-text placeholder:text-black/30 text-sm outline-none focus:border-primary transition"
                                                    onChange={(e) => setCustomDuration(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (customDuration) {
                                                            setDuration('custom');
                                                            setDurationSheetOpen(false);
                                                        }
                                                    }}
                                                    className="bg-primary text-onPrimary px-8 rounded-xl font-bold shadow-md"
                                                >
                                                    Set
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. INTENSITY */}
                        <div>
                            <div className="text-white/60 type-label mb-3">Intensity</div>
                            <div className="flex gap-2">
                                {[
                                    { id: 'zone2', label: 'Zone 2 (Easy)' },
                                    { id: 'threshold', label: 'Threshold (Hard)' },
                                    { id: 'max_effort', label: 'Max (All Out)' }
                                ].map(i => (
                                    <button
                                        key={i.id}
                                        onClick={() => setIntensity(i.id as any)}
                                        className={`flex-1 py-4 px-2 rounded-2xl type-label transition border-2 ${intensity === i.id
                                            ? 'bg-secondary border-secondary text-white shadow-md'
                                            : 'bg-surface border-transparent text-secondary hover:border-black/5'
                                            }`}
                                    >
                                        {i.label.split(' (')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. PREP LEAD TIME (Ex-Buttons, now Slider?) */}
                        {/* 4. PREP LEAD TIME (New) */}
                        <div>
                            <div className="text-white/60 type-label mb-3">Protocol Lead Time (Prep Days)</div>
                            <div className="bg-surface rounded-2xl p-6 border border-black/5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-3xl font-bold font-display text-secondary leading-none">{prepLeadTime} <span className="text-lg font-sans font-medium text-secondary">Days</span></span>
                                    {prepLeadTime === 3 && prepLeadTime <= maxLeadTime && <span className="type-label bg-success/20 text-success px-2 py-0.5 rounded">Recommended</span>}
                                    {prepLeadTime > maxLeadTime && <span className="type-label bg-error/20 text-error px-2 py-0.5 rounded">Limited by Event Date</span>}
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="14"
                                    value={prepLeadTime}
                                    disabled={maxLeadTime < 1}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setPrepLeadTime(val);
                                    }}
                                    className="w-full h-4 bg-background rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
                                />
                                <div className="flex justify-between mt-2 text-xs font-bold text-secondary uppercase tracking-wider">
                                    <span>1 Day</span>
                                    <span>{maxLeadTime} Days Max</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. TRAVEL (Optional) */}
                        <div className="pt-6 border-t border-black/5">
                            <button
                                onClick={() => setIsTraveling(!isTraveling)}
                                className="flex items-center gap-2 text-text type-label mb-4 w-full"
                            >
                                <span className={`w-5 h-5 rounded-full border-2 border-current flex items-center justify-center transition-colors ${isTraveling ? 'bg-primary border-primary text-onPrimary' : 'text-white/60 border-white/30'}`}>
                                    {isTraveling && <Check size={12} strokeWidth={4} />}
                                </span>
                                Travel Logistics (Optional)
                            </button>


                            {isTraveling && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex gap-2">
                                        {['flight', 'drive', 'train', 'other'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setTravelMode(m as any)}
                                                className={`flex-1 py-3 rounded-xl type-label transition border-2 ${travelMode === m ? 'bg-primary border-primary text-onPrimary' : 'bg-surface border-transparent text-secondary'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="datetime-local"
                                            value={travelStartTime}
                                            onChange={(e) => setTravelStartTime(e.target.value)}
                                            className="flex-1 bg-surface border border-transparent focus:border-black/10 rounded-xl p-3 text-sm font-sans outline-none shadow-sm"
                                            placeholder="Start Time"
                                        />
                                        <input
                                            type="number"
                                            value={travelDuration}
                                            onChange={(e) => setTravelDuration(e.target.value)}
                                            className="w-24 bg-surface border border-transparent focus:border-black/10 rounded-xl p-3 text-sm font-sans outline-none shadow-sm"
                                            placeholder="Hrs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={!customStartTime || !customDuration || !intensity}
                            onClick={handleNext}
                            className="w-full bg-text text-background font-display font-bold text-2xl py-6 rounded-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition shadow-xl"
                        >
                            Next Step
                        </button>
                    </div>
                )}

                {/* --- STEP 2: GUT CHECK --- */}
                {step === 'gut' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500 h-full flex flex-col">
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <div className="text-[10rem] font-bold leading-none mb-6 text-primary font-display tracking-tight text-stroke">
                                {gutScale}
                            </div>

                            <div className="w-full bg-surface border-2 border-black/5 rounded-full h-16 p-2 mb-8 flex items-center relative shadow-inner">
                                <input
                                    type="range" min="1" max="10" value={gutScale} onChange={(e) => setGutScale(Number(e.target.value))}
                                    className="w-full h-full opacity-0 absolute inset-0 z-10 cursor-pointer touch-none"
                                    style={{ touchAction: 'none' }}
                                />
                                <div className="h-full bg-primary rounded-full transition-all duration-300 relative pointer-events-none" style={{ width: `${gutScale * 10}%` }}>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-surface rounded-full shadow-md border border-black/5"></div>
                                </div>
                            </div>

                            <div className="text-2xl font-bold text-center text-text mb-8 font-display uppercase tracking-tight">
                                {gutScale > 7 ? 'Feeling Excellent' : gutScale > 4 ? 'Mild Symptoms' : 'Severe Flare'}
                            </div>

                            {gutScale < 9 && (
                                <div className="flex flex-wrap gap-3 justify-center relative z-20">
                                    {commonSymptomList.map(s => (
                                        <button key={s} onClick={() => toggleSymptom(s)}
                                            className={`px-6 py-3 rounded-full text-sm transition font-sans font-bold uppercase tracking-wide border-2 hover:scale-105 active:scale-95 touch-manipulation ${symptoms.includes(s)
                                                ? 'bg-error border-error text-white shadow-lg shadow-error/20'
                                                : 'bg-surface border-transparent text-secondary hover:border-black/5'
                                                }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={handleNext} className="w-full bg-text text-background font-display font-bold text-2xl py-6 rounded-full mt-auto shadow-xl hover:scale-[1.02] active:scale-[0.98] transition">
                            {loading ? 'CALCULATING...' : (editId ? 'UPDATE PROTOCOL' : 'GENERATE PLAN')}
                        </button>
                    </div>
                )}

                {/* --- STEP 3: PLAN (Expressive Timeline) --- */}
                {step === 'plan' && finalPlan && (
                    <div className="animate-in slide-in-from-bottom duration-500 pb-32">

                        {/* Update Feedback Banner */}
                        {lastUpdateParams && (
                            <div className="bg-primary/20 border border-primary text-text-inverse p-4 rounded-2xl mb-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="bg-primary text-onPrimary rounded-full p-2 shrink-0">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                                <div className="text-sm font-sans font-medium text-text-inverse">
                                    Timeline optimized for <strong>{lastUpdateParams}</strong>.
                                </div>
                            </div>
                        )}

                        {/* Protocol Card Container (Only for TimelineView) */}
                        {editId ? (
                            <>
                                <div className="bg-surface rounded-[3rem] p-8 mb-6 shadow-sm border border-black/5 relative overflow-hidden text-text-inverse">
                                    {/* Decorative blotch */}
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${finalPlan.theme === 'green' ? 'bg-success' : 'bg-primary'}`}></div>

                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div>
                                            <div className="text-secondary uppercase tracking-widest text-[10px] font-sans font-bold mb-2">Protocol</div>
                                            <h2 className="text-2xl font-bold text-text-inverse leading-[0.95] font-display tracking-tight max-w-[90%] mb-1">
                                                {sessionTitle || 'My Protocol'}
                                            </h2>
                                            <div className="text-sm font-sans font-medium text-text-inverse/70 leading-snug max-w-[85%]">
                                                {finalPlan.headline}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SMART COUNTDOWN & HEADER */}
                                    {(() => {
                                        // Find the main event (Race/Training Start)
                                        const startEvent = finalPlan.timeline.find(e => e.label === "Start Time");
                                        const eventTime = startEvent?._timestamp || Date.now();
                                        const firstEventTime = finalPlan.timeline[0]?._timestamp || Date.now();
                                        const now = Date.now();
                                        const timeToProtocol = firstEventTime - now;

                                        return (
                                            <div className="mb-6 bg-black/5 rounded-3xl p-6">
                                                {/* Explicit Event Date Header */}
                                                <div className="flex flex-col items-center justify-center mb-6">
                                                    <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-text-inverse/60 mb-1">Target Event</div>
                                                    <div className="text-xl font-display font-bold text-text-inverse">
                                                        {new Date(eventTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                        <span className="opacity-50 mx-2">@</span>
                                                        {new Date(eventTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                </div>

                                                {/* Dual Countdowns if early */}
                                                {timeToProtocol > 300000 ? ( // If > 5 mins before protocol start
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {/* 1. Protocol Countdown */}
                                                        <div className="bg-white/40 rounded-2xl p-4 text-center border border-white/20 shadow-sm">
                                                            <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-secondary mb-2">Protocol Begins In</div>
                                                            <CountdownTimer targetTime={Date.now() + (prepLeadTime * 24 * 60 * 60 * 1000)} variant="minimal" className="text-lg md:text-xl font-bold font-display tracking-tight text-text-inverse leading-none" />
                                                        </div>

                                                        {/* 2. Event Countdown */}
                                                        <div className="bg-white/40 rounded-2xl p-4 text-center border border-white/20 shadow-sm">
                                                            <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-secondary mb-2">Event Starts In</div>
                                                            <CountdownTimer targetTime={eventTime} variant="minimal" className="text-lg md:text-xl font-bold font-display tracking-tight text-text-inverse/60 leading-none" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Standard Event Countdown (Active Prep)
                                                    <div className="flex justify-center">
                                                        <CountdownTimer targetTime={eventTime} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="mb-6">
                                    <ProtocolDeck
                                        plan={finalPlan}
                                        checkedItems={checkedItems}
                                        onToggleCheck={toggleCheck}
                                        onEnd={() => setShowEndConfirm(true)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-surface rounded-[3rem] p-8 mb-6 shadow-sm border border-black/5 relative overflow-hidden text-text-inverse">
                                    {/* Decorative blotch */}
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${finalPlan.theme === 'green' ? 'bg-success' : 'bg-primary'}`}></div>

                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div>
                                            <div className="text-secondary uppercase tracking-widest text-[10px] font-sans font-bold mb-2">Protocol</div>
                                            <h2 className="text-2xl font-bold text-text-inverse leading-[0.95] font-display tracking-tight max-w-[90%] mb-1">
                                                {sessionTitle || 'My Protocol'}
                                            </h2>
                                            <div className="text-sm font-sans font-medium text-text-inverse/70 leading-snug max-w-[85%]">
                                                {finalPlan.headline}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SMART COUNTDOWN & HEADER (Timeline View Only) */}
                                    {(() => {
                                        // Find the main event (Race/Training Start)
                                        const startEvent = finalPlan.timeline.find(e => e.label === "Start Time");
                                        const eventTime = startEvent?._timestamp || Date.now();
                                        const firstEventTime = finalPlan.timeline[0]?._timestamp || Date.now();
                                        const now = Date.now();
                                        const timeToProtocol = firstEventTime - now;

                                        return (
                                            <div className="mb-6 bg-black/5 rounded-3xl p-6">
                                                {/* Explit Event Date Header */}
                                                <div className="flex flex-col items-center justify-center mb-6">
                                                    <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-text-inverse/60 mb-1">Target Event</div>
                                                    <div className="text-xl font-display font-bold text-text-inverse">
                                                        {new Date(eventTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                        <span className="opacity-50 mx-2">@</span>
                                                        {new Date(eventTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                </div>

                                                {/* Dual Countdowns if early */}
                                                {timeToProtocol > 300000 ? ( // If > 5 mins before protocol start
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {/* 1. Protocol Countdown */}
                                                        <div className="bg-white/40 rounded-2xl p-4 text-center border border-white/20 shadow-sm">
                                                            <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-secondary mb-2">Protocol Begins In</div>
                                                            <CountdownTimer targetTime={Date.now() + (prepLeadTime * 24 * 60 * 60 * 1000)} variant="minimal" className="text-lg md:text-xl font-bold font-display tracking-tight text-text-inverse leading-none" />
                                                        </div>

                                                        {/* 2. Event Countdown */}
                                                        <div className="bg-white/40 rounded-2xl p-4 text-center border border-white/20 shadow-sm">
                                                            <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-secondary mb-2">Event Starts In</div>
                                                            <CountdownTimer targetTime={eventTime} variant="minimal" className="text-lg md:text-xl font-bold font-display tracking-tight text-text-inverse/60 leading-none" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Standard Event Countdown (Active Prep)
                                                    <div className="flex justify-center">
                                                        <CountdownTimer targetTime={eventTime} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Protocol Overview */}
                                <ProtocolOverview
                                    plan={finalPlan}
                                    leadTimeDays={prepLeadTime}
                                    intensity={intensity || 'moderate'}
                                    gutScale={gutScale}
                                />

                                {/* Timeline is now outside the card directly on the background */}
                                <div className="relative">
                                    <TimelineView
                                        plan={finalPlan}
                                        checkedItems={checkedItems}
                                        expandedItems={expandedItems}
                                        onToggleCheck={undefined}
                                        onToggleExpanded={toggleExpanded}
                                        readOnly={false}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* FLOATING ACTION BUTTON (Save & Sync) */}
                {step === 'plan' && (
                    <div className="fixed bottom-8 left-6 right-6 z-[60] flex flex-col gap-3">
                        <button
                            onClick={() => {
                                if (editId) {
                                    updateLog(editId, { updatedAt: Date.now() }); // Touch update
                                    navigate('/');
                                } else {
                                    if (finalPlan) {
                                        const sTime = sessionTime === 'custom' ? 'now' : sessionTime;
                                        const dTime = duration === 'custom' ? 'medium' : duration;

                                        saveLog({
                                            sessionTime: sTime!,
                                            intensity: intensity!,
                                            duration: dTime!,
                                            gutScale,
                                            symptoms,
                                            plan: finalPlan,
                                            targetStartTime: customStartTime ? new Date(customStartTime).getTime() : Date.now(),
                                            title: sessionTitle || 'Training Session',
                                            leadTimeDays: prepLeadTime
                                        });
                                        navigate('/');
                                    }
                                }
                            }}
                            className="w-full bg-primary text-onPrimary font-display font-bold text-2xl py-6 rounded-full shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition"
                        >
                            {editId ? 'SAVE & SYNC' : 'START PROTOCOL'}
                        </button>
                    </div>
                )}

                {/* End Session Confirmation Modal */}
                {showEndConfirm && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
                        <div className="bg-surface w-full max-w-xs rounded-[2rem] p-8 text-center animate-in zoom-in-95 duration-200 shadow-2xl border border-black/5">
                            <h3 className="text-xl font-bold text-secondary mb-2 font-display uppercase">End Session?</h3>
                            <p className="text-secondary text-sm mb-8 leading-relaxed">
                                Are you sure you want to end this protocol? It will be moved to your history.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (editId) {
                                            completeSession(editId);
                                            navigate(`/feedback/${editId}`);
                                        }
                                    }}
                                    className="w-full bg-error text-white font-sans font-bold py-4 rounded-xl shadow-lg shadow-error/20 uppercase tracking-wider text-xs"
                                >
                                    Yes, End Protocol
                                </button>
                                <button
                                    onClick={() => setShowEndConfirm(false)}
                                    className="w-full bg-background text-text font-sans font-bold py-4 rounded-xl hover:bg-black/5 uppercase tracking-wider text-xs"
                                >
                                    No, Keep Going
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {
                step === 'plan' && editId && (
                    <>
                        <div className="fixed bottom-6 right-6 z-50">
                            <button
                                onClick={() => setShowAddEvent(true)}
                                className="bg-primary text-onPrimary w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition active:scale-95 shadow-primary/30"
                            >
                                <div className="text-3xl font-light mb-1">+</div>
                            </button>
                        </div>

                        {/* Add Event Overlay */}
                        {showAddEvent && (
                            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-surface w-full max-w-md rounded-t-[2rem] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-text">Log Event</h3>
                                        <button onClick={() => setShowAddEvent(false)} className="bg-black/5 p-2 rounded-full text-secondary hover:text-text transition">
                                            <span className="sr-only">Close</span>
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => { setShowAddEvent(false); setGutScaleModalCompat(true); }} className="bg-black/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-black/10 transition">
                                            <span className="bg-secondary/20 text-secondary p-3 rounded-xl"><Zap size={24} /></span>
                                            <span className="font-medium text-text">Bowel Mvmnt</span>
                                        </button>
                                        <button onClick={() => { setShowAddEvent(false); alert("Meal logging coming in v1.1"); }} className="bg-black/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-black/10 transition">
                                            <span className="bg-green-500/20 text-green-500 p-3 rounded-xl"><Utensils size={24} /></span>
                                            <span className="font-medium text-text">Meal</span>
                                        </button>
                                        <button onClick={() => { setShowAddEvent(false); alert("Sleep logging coming in v1.1"); }} className="bg-black/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-black/10 transition">
                                            <span className="bg-primary/20 text-primary-dark p-3 rounded-xl"><Moon size={24} /></span>
                                            <span className="font-medium text-text">Sleep</span>
                                        </button>
                                        <button onClick={() => { setShowAddEvent(false); alert("Note logging coming in v1.1"); }} className="bg-black/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-black/10 transition">
                                            <span className="bg-secondary/20 text-secondary p-3 rounded-xl"><MessageCircle size={24} /></span>
                                            <span className="font-medium text-text">Symptom</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recalibration Modal (Gut Scale) */}
                        {gutScaleModalCompat && (
                            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
                                <div className="bg-surface w-full max-w-sm rounded-[2rem] p-8 text-center animate-in zoom-in-95 duration-200 shadow-2xl border border-black/5">
                                    <h3 className="text-2xl font-bold text-secondary mb-2">Recalibrate</h3>
                                    <p className="text-secondary mb-8">Update your gut state to adjust the timeline.</p>

                                    <div className="text-[5rem] font-bold leading-none mb-4 text-primary font-display tracking-tight">
                                        {gutScale}
                                    </div>

                                    <input
                                        type="range" min="1" max="10" value={gutScale} onChange={(e) => setGutScale(Number(e.target.value))}
                                        className="w-full accent-primary h-2 bg-black/10 rounded-lg appearance-none cursor-pointer mb-8"
                                    />

                                    <button
                                        onClick={() => {
                                            setGutScaleModalCompat(false);
                                            setLastUpdateParams(`Gut Change (State ${gutScale})`);

                                            if (editId) {
                                                const logs = getLogs();
                                                const currentFnLog = logs.find(l => l.id === editId);
                                                const events = currentFnLog?.adhocEvents || [];
                                                const newEvent = {
                                                    id: crypto.randomUUID(),
                                                    type: 'bowel',
                                                    timestamp: Date.now(),
                                                    detail: `Bowel Movement (Scale ${gutScale})`
                                                };
                                                updateLog(editId, { adhocEvents: [...events, newEvent] as any });
                                            }

                                            // Then trigger next to regenerate
                                            handleNext();
                                        }}
                                        className="w-full bg-primary text-onPrimary font-medium text-lg py-4 rounded-full shadow-lg shadow-primary/20"
                                    >
                                        Update Protocol
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )
            }

        </div >
    );
}
