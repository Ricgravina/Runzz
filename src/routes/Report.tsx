import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getLogs, LogEntry } from '../lib/storage';
import { AnalysisReport } from '../components/AnalysisReport';

export default function Report() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [log, setLog] = useState<LogEntry | null>(null);

    useEffect(() => {
        if (id) {
            const logs = getLogs();
            const found = logs.find(l => l.id === id);
            if (found) {
                setLog(found);
            }
        }
    }, [id]);

    if (!log) return <div className="p-6 text-text">Loading...</div>;

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans h-screen overflow-y-auto text-text bg-background">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pt-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/history')}
                        className="bg-surface p-2.5 rounded-full text-text-inverse hover:bg-black/5 transition shadow-sm border border-black/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-text leading-none font-display">Coach Report</h1>
                </div>

                {/* Edit Feedback Button */}
                <button
                    onClick={() => navigate(`/feedback/${id}`)}
                    className="bg-surface p-2.5 rounded-full text-secondary hover:bg-black/5 transition flex items-center gap-2 shadow-sm border border-black/5"
                >
                    <Pencil size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider pr-1">Edit</span>
                </button>
            </div>

            <div className="space-y-6">
                {/* Session Context Card */}
                <div className="bg-surface text-text-inverse rounded-[2rem] p-5 shadow-sm border border-black/5">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-bold text-text-inverse capitalize text-lg leading-none">
                                {log.intensity.replace('_', ' ')} Session
                            </div>
                            <div className="text-xs text-text-inverse/60 font-mono mt-1 flex items-center gap-1">
                                {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {log.title && <span className="text-text-inverse/40">• {log.title}</span>}
                            </div>
                        </div>
                        <div className="flex text-orange-400 text-xs gap-0.5 bg-black/5 px-2 py-1 rounded-lg">
                            {log.feedback && Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < log.feedback!.rating ? "opacity-100" : "opacity-30"}>★</span>
                            ))}
                        </div>
                    </div>
                </div>

                {log.analysis ? (
                    <AnalysisReport analysis={log.analysis} />
                ) : (
                    <div className="text-center p-8 bg-surface rounded-3xl text-secondary">
                        Analysis not yet available.
                    </div>
                )}
            </div>
        </div>
    );
}
