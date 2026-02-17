import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, Save } from 'lucide-react';
import { getLogs, updateLog, LogEntry } from '../lib/storage';
import { generateAnalysis } from '../lib/recommendations';

export default function Feedback() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [log, setLog] = useState<LogEntry | null>(null);

    // Form State
    const [rating, setRating] = useState(0);
    const [gutRating, setGutRating] = useState(5);
    const [workedWell, setWorkedWell] = useState<string[]>([]);
    const [workedBadly, setWorkedBadly] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (id) {
            const logs = getLogs();
            const found = logs.find(l => l.id === id);
            if (found) {
                setLog(found);
                // Pre-fill if exists
                if (found.feedback) {
                    setRating(found.feedback.rating);
                    setGutRating(found.feedback.gutRating);
                    setWorkedWell(found.feedback.workedWell);
                    setWorkedBadly(found.feedback.workedBadly);
                    setNotes(found.feedback.notes);
                }
            }
        }
    }, [id]);

    const handleToggle = (item: string, list: string[], setList: (s: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSubmit = () => {
        if (!log) return;

        // Generate Deep Analysis
        const feedbackData = {
            rating,
            gutRating,
            workedWell,
            workedBadly,
            notes,

        };

        const analysis = generateAnalysis({ ...log, feedback: feedbackData });

        updateLog(log.id, {
            feedback: feedbackData,
            analysis
        });

        navigate('/history');
    };

    if (!log) return <div className="p-6 text-text">Loading...</div>;

    const categories = ['Nutrition', 'Hydration', 'Timing', 'Intensity', 'Sleep'];

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans h-screen overflow-y-auto text-text bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pt-4 shrink-0">
                <button
                    onClick={() => navigate('/history')}
                    className="bg-surface p-2.5 rounded-full text-text-inverse hover:bg-black/5 transition shadow-sm border border-black/5"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-text leading-none font-display">Session Feedback</h1>
            </div>

            <div className="space-y-8">
                {/* Rating */}
                <div>
                    <label className="block text-text/80 text-xs uppercase font-bold tracking-wider mb-3">Overall Rating</label>
                    <div className="flex gap-2 justify-between px-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-transform hover:scale-110 ${rating >= star ? 'text-orange-400' : 'text-text/20'}`}
                            >
                                <Star size={32} fill={rating >= star ? "currentColor" : "none"} strokeWidth={rating >= star ? 0 : 2} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gut Rating */}
                <div>
                    <div className="flex justify-between mb-3">
                        <label className="block text-text/80 text-xs uppercase font-bold tracking-wider">Gut Comfort</label>
                        <span className="text-primary font-bold">{gutRating}/10</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={gutRating}
                        onChange={(e) => setGutRating(parseInt(e.target.value))}
                        className="w-full accent-primary h-2 bg-text/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-text/60 mt-1 font-sans">
                        <span>Painful</span>
                        <span>Perfect</span>
                    </div>
                </div>

                {/* What Worked Well */}
                <div>
                    <label className="block text-text/80 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        <ThumbsUp size={14} /> What Worked Well?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleToggle(cat, workedWell, setWorkedWell)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition border ${workedWell.includes(cat)
                                    ? 'bg-success text-white border-success shadow-md shadow-success/20'
                                    : 'bg-surface border-black/5 text-text-inverse/80 hover:bg-black/5'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* What Worked Badly */}
                <div>
                    <label className="block text-text/80 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        <ThumbsDown size={14} /> What Didn't Work?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleToggle(cat, workedBadly, setWorkedBadly)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition border ${workedBadly.includes(cat)
                                    ? 'bg-error text-white border-error shadow-md shadow-error/20'
                                    : 'bg-surface border-black/5 text-text-inverse/80 hover:bg-black/5'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-text/80 text-xs uppercase font-bold tracking-wider mb-3">Notes & Details</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="How did the run feel? Did the plan work?"
                        className="w-full bg-surface border border-black/5 rounded-2xl p-4 text-text-inverse font-medium outline-none focus:border-primary transition h-32 resize-none placeholder:text-text-inverse/50"
                    />
                </div>

                <div className="h-4"></div>

                <button
                    onClick={handleSubmit}
                    className="w-full bg-primary text-text-inverse font-bold text-lg py-4 rounded-full flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition shadow-xl shadow-primary/20"
                >
                    <Save size={20} />
                    Save Feedback
                </button>
            </div>
        </div>
    );
}
