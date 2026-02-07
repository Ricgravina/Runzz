import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Zap, Check } from 'lucide-react';
import { getFutureEvents, getProfile } from '../lib/storage';
import { generateTimeline } from '../lib/recommendations';
import TimelineView from '../components/TimelineView';
import { useState, useEffect } from 'react';
import { TimelinePlan } from '../lib/recommendations';

export default function EventPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<TimelinePlan | null>(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');

    useEffect(() => {
        if (!id) return;
        const events = getFutureEvents();
        const event = events.find(e => e.id === id);

        if (event) {
            setEventTitle(event.title);
            setEventDate(event.date);

            // Mock Data for Preview
            const profile = getProfile();
            const targetTimeMs = new Date(`${event.date}T09:00:00`).getTime(); // Assume 9am for preview
            // Or use event date as the "Now" reference time? 
            // Better: Reference time = 9:00 AM on event day.
            // Offset Minutes = 0 (Start of event)

            const previewPlan = generateTimeline(
                '2hr+', // Assume long race for robust preview
                event.intensity,
                event.duration,
                8, // Assume good gut
                [], // No symptoms
                [], // No history context needed
                targetTimeMs, // Reference point (Start time)
                0, // Offset 0
                event.duration === 'long' ? 180 : 90,
                profile
            );

            setPlan(previewPlan);
        }
    }, [id]);

    if (!plan) return <div className="p-6 text-center text-secondary">Loading preview...</div>;

    return (
        <div className="p-6 pb-32 min-h-screen bg-background text-text flex flex-col">
            <header className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/calendar')}
                    className="w-10 h-10 rounded-full bg-surface border border-black/5 flex items-center justify-center text-secondary hover:text-text hover:bg-black/5 transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold font-display leading-none">Protocol Preview</h1>
                    <p className="text-secondary text-xs uppercase tracking-wider font-mono mt-0.5">{eventTitle}</p>
                </div>
            </header>

            {/* Protocol Card */}
            <div className="bg-surface rounded-[2.5rem] p-6 mb-6 shadow-sm border border-black/5 relative overflow-hidden flex-1">
                {/* Decorative blotch */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${plan.theme === 'green' ? 'bg-success' : 'bg-primary'}`}></div>

                <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                        <div className="text-text-dim uppercase tracking-widest text-[10px] font-mono font-bold mb-2 flex items-center gap-2">
                            <Calendar size={12} />
                            {new Date(eventDate).toLocaleDateString()}
                        </div>
                        <h2 className="text-2xl font-bold text-text-inverse leading-[0.95] font-display uppercase tracking-tight max-w-[90%]">
                            {plan.headline}
                        </h2>
                    </div>
                    <div className={`p-3 rounded-full border-2 ${plan.theme === 'green' ? 'bg-success border-success text-white' : 'bg-primary border-primary text-onPrimary'}`}>
                        {plan.theme === 'green' ? <Check size={20} /> : <Zap size={20} />}
                    </div>
                </div>

                {/* READ ONLY TIMELINE */}
                <TimelineView plan={plan} readOnly={true} />
            </div>

            <div className="text-center text-secondary text-xs font-mono opacity-60">
                Simulation based on ideal conditions (Gut Score: 8).
                <br />Actual plan may vary on race day.
            </div>
        </div>
    );
}
