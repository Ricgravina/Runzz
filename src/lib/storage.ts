import { supabase } from './supabase';

export interface LogEntry {
    id: string;
    timestamp: number;
    // Session Context
    sessionTime: 'just_finished' | 'now' | '1hr' | '2hr+' | 'race_prep_72h';
    intensity: 'zone2' | 'threshold' | 'max_effort'; // refined descriptors
    duration: 'short' | 'medium' | 'long' | 'ultra'; // <1h, 1-2h, 2-4h, 4h+

    // Gut Status
    gutScale: number; // 1-10
    symptoms: string[];

    // Meta
    // Travel Context
    travel?: {
        isTraveling: boolean;
        startTime?: number; // timestamp
        durationMinutes?: number;
        mode: 'flight' | 'drive' | 'train' | 'other';
    };

    title?: string; // User-defined name (e.g. "Marathon", "Long Run")
    notes?: string;
    plan: any;
    status: 'active' | 'completed';
    updatedAt?: number;
    targetStartTime?: number; // Absolute timestamp for when the session is planned to start
    leadTimeDays?: number; // User preference for prep horizon (1, 2, 3)


    // Live Events (User added during the session)
    adhocEvents?: {
        id: string;
        type: 'bowel' | 'meal' | 'sleep' | 'symptom' | 'workout';
        timestamp: number;
        detail?: string;
    }[];

    // Post-Protocol Feedback
    feedback?: {
        rating: number; // 1-5
        gutRating: number; // 1-10
        workedWell: string[];
        workedBadly: string[];
        notes: string;
        advice?: string; // Legacy simple summary
    };

    // Deep Analysis (Coach Report)
    analysis?: {
        readiness: number;
        outcome: string;
        adherence: number;
        riskLevel: string;
        deviations: { title: string; details: string[] }[];
        interpretation: {
            primary: string;
            signals: string[];
            contributors: string[];
            negatives: string[];
        };
        recommendations: { category: string; items: string[] }[];
        confidence: {
            stability: string;
            fuelingRisk: string;
            changeNeed: string;
        };
        coachNote: string;
    };
}

const STORAGE_KEY = 'ibd_logs';

export const saveLog = async (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>) => {
    const newEntry: LogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        status: 'active',
    };

    const existing = getLogs();
    // Auto-complete previous active sessions
    const closedLogs = existing.map(l => l.status === 'active' ? { ...l, status: 'completed' as const } : l);

    const updated = [newEntry, ...closedLogs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // CLOUD SYNC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Insert new log
        await (supabase.from('logs') as any).insert({
            id: newEntry.id,
            user_id: user.id,
            timestamp: newEntry.timestamp,
            session_time: newEntry.sessionTime,
            intensity: newEntry.intensity,
            duration: newEntry.duration,
            gut_scale: newEntry.gutScale,
            symptoms: newEntry.symptoms,
            plan: newEntry.plan,
            status: newEntry.status,
            target_start_time: newEntry.targetStartTime,
            lead_time_days: newEntry.leadTimeDays
        });

        // Update closed logs
        // Optimistically we assume closedLogs only has 1 change usually, but for now simple sync
    }

    return newEntry;
};

export const updateLog = async (id: string, updates: Partial<Omit<LogEntry, 'id' | 'timestamp'>>) => {
    const logs = getLogs();
    const updated = logs.map(log => {
        if (log.id === id) {
            return { ...log, ...updates, updatedAt: Date.now() };
        }
        return log;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // CLOUD SYNC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await (supabase.from('logs') as any).update({
            ...updates as any, // Cast for partial mapping flexibility
            plan: updates.plan, // Ensure json is passed correctly
            target_start_time: updates.targetStartTime,
            lead_time_days: updates.leadTimeDays
        }).eq('id', id);
    }
};

export const checkConflict = (startTime: number, durationMinutes: number): boolean => {
    const logs = getLogs();
    const endTime = startTime + (durationMinutes * 60000);

    return logs.some(log => {
        if (!log.targetStartTime || log.status === 'completed') return false;

        // Estimate log duration (fallback to 90 mins if missing)
        let logDuration = 90;
        if (log.duration === 'short') logDuration = 45;
        if (log.duration === 'long') logDuration = 180;
        if (log.duration === 'ultra') logDuration = 240;

        const logStart = log.targetStartTime;
        const logEnd = logStart + (logDuration * 60000);

        // Overlap Check
        return (startTime < logEnd && endTime > logStart);
    });
};

// Check for future event conflicts (including prep windows)
export const checkFutureConflict = (dateStr: string): string | null => {
    const events = getFutureEvents();
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);

    for (const e of events) {
        // 1. Direct Overlap
        if (e.date === dateStr) {
            return `Conflict with event: "${e.title}" on this day.`;
        }

        // 2. Prep Window Overlap (If existing event is a RACE)
        if (e.type === 'race') {
            const raceDate = new Date(e.date);
            raceDate.setHours(0, 0, 0, 0);

            // Diff in days
            const diffTime = raceDate.getTime() - checkDate.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays > 0 && diffDays <= 3) {
                return `Conflict: This day is part of the T-72h prep for "${e.title}".`;
            }
        }
    }
    return null;
};

export const completeSession = async (id: string) => {
    await updateLog(id, { status: 'completed' });
};

export const deleteLog = async (id: string) => {
    const logs = getLogs().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // CLOUD SYNC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('logs').delete().eq('id', id);
    }
};

export const getLogs = (): LogEntry[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse logs', e);
        return [];
    }
};

// NEW: Sync function to pull from cloud
export const syncLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (supabase.from('logs') as any).select('*');
    if (!error && data) {
        // Simple merge: Cloud wins? Or just simple overwrite for MVP
        // Transforming DB rows back to LogEntries if needed
        const existingLogs = getLogs(); // Read current local state

        const mapped: LogEntry[] = (data as any[]).map(d => {
            const local = existingLogs.find(l => l.id === d.id);
            return {
                id: d.id,
                timestamp: d.timestamp,
                sessionTime: d.session_time,
                intensity: d.intensity,
                duration: d.duration,
                gutScale: d.gut_scale || 0,
                symptoms: d.symptoms || [],
                status: d.status || 'completed',
                plan: d.plan,
                // Fallback to local if missing in cloud (Schema migration safety)
                targetStartTime: d.target_start_time || local?.targetStartTime,
                leadTimeDays: d.lead_time_days || local?.leadTimeDays
            };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    }
};

export const getActiveSession = (): LogEntry | undefined => {
    const logs = getLogs();
    return logs.find(l => l.status === 'active');
};

export interface UserProfile {
    name?: string;
    weight: number; // kg
    height?: number; // cm
    gender: 'male' | 'female';
    intolerances?: { name: string; severity: 'mild' | 'moderate' | 'severe' }[]; // Updated to object
    bodyFat?: number; // %

    // Medical Context
    diagnoses?: string[];
    medications?: string[];
    supplements?: string[];
    customChips?: { category: 'diagnosis' | 'medication' | 'supplement', label: string }[];

    adhocEvents?: {
        id: string;
        type: 'bowel' | 'meal' | 'sleep' | 'symptom' | 'workout';
        timestamp: number;
        detail?: string;
    }[];
}

const PROFILE_KEY = 'ibd_profile_v1';

export const saveProfile = async (profile: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    // CLOUD SYNC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await (supabase.from('profiles') as any).upsert({
            id: user.id,
            weight: profile.weight,
            height: profile.height,
            gender: profile.gender,
            diagnoses: profile.diagnoses,
            medications: profile.medications
        });
    }
};

export const getProfile = (): UserProfile | null => {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return null;

    try {
        const parsed = JSON.parse(data);
        // Migration: Intolerances strings -> objects
        if (parsed.intolerances && Array.isArray(parsed.intolerances) && parsed.intolerances.length > 0 && typeof parsed.intolerances[0] === 'string') {
            parsed.intolerances = parsed.intolerances.map((s: string) => ({ name: s, severity: 'moderate' }));
            // Save migrated data back to storage immediately
            localStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
        }
        return parsed;
    } catch {
        return null;
    }
};

// --- Future Planning System ---

export interface FutureEvent {
    id: string;
    date: string; // YYYY-MM-DD
    type: 'race' | 'training' | 'other';
    title: string;
    intensity: 'zone2' | 'threshold' | 'max_effort';
    duration: 'short' | 'medium' | 'long' | 'ultra';
    processed?: boolean; // If true, we've already generated the T-72h prep for this
}

const EVENTS_KEY = 'ibd_future_events';

export const saveFutureEvent = (event: Omit<FutureEvent, 'id'>) => {
    const events = getFutureEvents();
    const newEvent: FutureEvent = { ...event, id: crypto.randomUUID() };
    localStorage.setItem(EVENTS_KEY, JSON.stringify([...events, newEvent]));
    return newEvent;
};

export const getFutureEvents = (): FutureEvent[] => {
    try {
        const raw = localStorage.getItem(EVENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const deleteFutureEvent = (id: string) => {
    const events = getFutureEvents().filter(e => e.id !== id);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

export const markEventProcessed = (id: string) => {
    const events = getFutureEvents().map(e => e.id === id ? { ...e, processed: true } : e);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

// --- Insights System ---

export interface InsightTip {
    text: string;
    category: string; // e.g. "Hydration", "Fueling"
    sourceLogId: string;
    date: number;
}

export const getAggregatedTips = (): InsightTip[] => {
    const logs = getLogs();
    const tips: InsightTip[] = [];

    logs.forEach(log => {
        if (!log.analysis || !log.analysis.recommendations) return;

        log.analysis.recommendations.forEach(rec => {
            rec.items.forEach(item => {
                tips.push({
                    text: item,
                    category: rec.category,
                    sourceLogId: log.id,
                    date: log.timestamp
                });
            });
        });
    });

    // Simple shuffle or sort by recent? 
    // Let's sort by date (newest first) then deduplicate text
    tips.sort((a, b) => b.date - a.date);

    // Deduplicate by text
    const uniqueHelper = new Set<string>();
    const uniqueTips: InsightTip[] = [];

    for (const t of tips) {
        if (!uniqueHelper.has(t.text)) {
            uniqueHelper.add(t.text);
            uniqueTips.push(t);
        }
    }

    return uniqueTips;
};
