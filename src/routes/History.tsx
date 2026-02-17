import { useEffect, useState } from 'react';
import { getLogs, LogEntry, deleteLog } from '../lib/storage';
import { Check, CheckCircle, Activity, Award, TrendingUp, Zap, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function History() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        adherence: 0,
        winRate: 0 // Success feeling
    });

    // Selection Logic
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const data = getLogs();
        setLogs(data);
        calculateStats(data);
    }, []);

    const calculateStats = (data: LogEntry[]) => {
        if (!data.length) return;

        const total = data.length;

        // Calculate Adherence Avg
        let adherenceSum = 0;
        let ratedCount = 0;

        // Calculate Win Rate (Gut scale <= 4 is a "win" for IBD)
        let wins = 0;

        data.forEach(log => {
            if (log.analysis?.adherence) {
                adherenceSum += log.analysis.adherence;
                ratedCount++;
            }
            if (log.gutScale <= 4) {
                wins++;
            }
        });

        setStats({
            total,
            adherence: ratedCount ? Math.round(adherenceSum / ratedCount) : 0,
            winRate: Math.round((wins / total) * 100)
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(prev => !prev);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleDelete = () => {
        if (selectedIds.size === 0) return;

        if (confirm(`Delete ${selectedIds.size} logs?`)) {
            selectedIds.forEach(id => deleteLog(id));

            // Update local state
            const remaining = logs.filter(l => !selectedIds.has(l.id));
            setLogs(remaining);
            calculateStats(remaining);

            // Reset selection
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans min-h-screen text-text bg-background">
            <header className="mb-8 pt-6 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold font-display text-text leading-none mb-1">Scorecard</h1>
                    <p className="text-text/60 font-sans text-xs uppercase tracking-wider">Performance Audit</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleSelectionMode}
                        className={`p-2.5 rounded-full transition border ${isSelectionMode ? 'bg-primary text-onPrimary border-primary' : 'bg-surface text-text-inverse border-black/5 hover:bg-black/5'}`}
                    >
                        {isSelectionMode ? <Check size={20} /> : <CheckCircle size={20} />}
                    </button>
                    {isSelectionMode && selectedIds.size > 0 && (
                        <button
                            onClick={handleDelete}
                            className="p-2.5 rounded-full bg-error/10 text-error border border-error/20 animate-in zoom-in spin-in-12 duration-200"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-surface text-text-inverse p-4 rounded-[1.5rem] border border-black/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="text-secondary mb-1"><Activity size={20} /></div>
                    <div className="text-xl font-bold text-text-inverse mb-0.5">{stats.total}</div>
                    <div className="type-label text-text-inverse/60">Sessions</div>
                </div>
                <div className="bg-surface text-text-inverse p-4 rounded-[1.5rem] border border-black/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="text-secondary mb-1"><Award size={20} /></div>
                    <div className="text-xl font-bold text-text-inverse mb-0.5">{stats.adherence}%</div>
                    <div className="type-label text-text-inverse/60">Adherence</div>
                </div>
                <div className="bg-surface text-text-inverse p-4 rounded-[1.5rem] border border-black/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="text-secondary mb-1"><TrendingUp size={20} /></div>
                    <div className="text-xl font-bold text-text-inverse mb-0.5">{stats.winRate}%</div>
                    <div className="type-label text-text-inverse/60">Wins</div>
                </div>
            </div>

            {/* List */}
            {logs.length === 0 ? (
                <div className="text-center text-text/60 mt-10 p-8 border border-dashed border-text/30 rounded-3xl">
                    <p className="font-bold">No records yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest pl-2 mb-4">Latest Logs</h3>
                    {logs.map(log => {
                        if (!log.intensity || !log.plan) return null;
                        const isSelected = selectedIds.has(log.id);

                        return (
                            <div
                                key={log.id}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(log.id);
                                    } else {
                                        navigate(log.feedback ? `/report/${log.id}` : `/checkin?editId=${log.id}`);
                                    }
                                }}
                                className={`w-full text-left rounded-[2rem] p-5 border-2 shadow-sm relative overflow-hidden transition hover:scale-[1.01] cursor-pointer 
                                    ${isSelected ? 'bg-primary/20 border-primary' : 'bg-surface text-text-inverse border-black/5'}
                                `}
                            >
                                {/* Selection Checkmark Overlay */}
                                {isSelectionMode && (
                                    <div className={`absolute top-4 left-4 z-20 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-onPrimary shadow-lg' : 'border-white/20 bg-white/10'}`}>
                                        {isSelected && <Check size={16} strokeWidth={3} />}
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${log.intensity === 'max_effort' || log.intensity === 'threshold' ? 'bg-error/10 text-error' : 'bg-primary/10 text-text-inverse'}`}>
                                            <Zap size={20} fill="currentColor" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-text-inverse capitalize text-lg leading-none">
                                                {log.intensity.replace('_', ' ')}
                                            </div>
                                            <div className="text-xs text-text-inverse/60 font-sans mt-1 flex items-center gap-1">
                                                {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                <span className="text-text-inverse/40">•</span>
                                                <span>{log.duration}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Score Pill */}
                                    {log.analysis && (
                                        <div className="bg-background px-3 py-1 rounded-full border border-black/5 flex items-center gap-1.5">
                                            <span className="type-label text-white/60">Score</span>
                                            <span className="text-sm font-bold text-primary">{log.analysis.readiness}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
