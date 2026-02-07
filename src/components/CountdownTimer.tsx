import { useEffect, useState } from 'react';
import { Timer, Clock } from 'lucide-react';

interface CountdownTimerProps {
    targetTime: number;
    variant?: 'card' | 'minimal';
}

export default function CountdownTimer({ targetTime, variant = 'card' }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const [status, setStatus] = useState<'pending' | 'active'>('pending');

    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const diff = targetTime - now;

            if (diff <= 0) {
                setStatus('active');
                const elapsed = Math.abs(diff);
                const hrs = Math.floor(elapsed / 3600000);
                const mins = Math.floor((elapsed % 3600000) / 60000);
                const secs = Math.floor((elapsed % 60000) / 1000);
                setTimeLeft(`+${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            } else {
                setStatus('pending');
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`-${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [targetTime]);

    if (!timeLeft) return null;

    if (variant === 'minimal') {
        return (
            <span className={`font-mono font-bold tracking-tight ${status === 'active' ? 'text-inherit' : 'opacity-80'}`}>
                {timeLeft}
            </span>
        );
    }

    return (
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between border shadow-sm transition-colors duration-500 ${status === 'active'
            ? 'bg-success/5 border-success/20'
            : 'bg-surface border-black/5'
            }`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center animate-pulse ${status === 'active' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    }`}>
                    {status === 'active' ? <Clock size={20} /> : <Timer size={20} />}
                </div>
                <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${status === 'active' ? 'text-success' : 'text-secondary'
                        }`}>
                        {status === 'active' ? 'Elapsed Time' : 'Starts In'}
                    </div>
                    <div className="text-xl font-bold font-mono text-text-inverse tabular-nums leading-none mt-0.5">
                        {timeLeft}
                    </div>
                </div>
            </div>

            {status === 'active' && (
                <div className="text-xs font-bold uppercase tracking-wider text-white bg-success px-3 py-1.5 rounded-full shadow-lg shadow-success/20">
                    Live
                </div>
            )}
        </div>
    );
}
