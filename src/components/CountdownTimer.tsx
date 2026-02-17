import { useEffect, useState } from 'react';
import { Timer, Clock } from 'lucide-react';

interface CountdownTimerProps {
    targetTime: number;
    className?: string;
    variant?: 'default' | 'minimal';
}

export default function CountdownTimer({ targetTime, className = "", variant = 'default' }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const [status, setStatus] = useState<'pending' | 'active'>('pending');

    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const diff = targetTime - now;

            const formatTime = (ms: number, prefix: string) => {
                const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((ms % (1000 * 60 * 60 * 24)) / 3600000);
                const mins = Math.floor((ms % 3600000) / 60000);
                const secs = Math.floor((ms % 60000) / 1000);

                let timeString = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                if (days > 0) {
                    timeString = `${days}d ${timeString}`;
                }
                return `${prefix}${timeString}`;
            };

            if (diff <= 0) {
                setStatus('active');
                setTimeLeft(formatTime(Math.abs(diff), '+'));
            } else {
                setStatus('pending');
                setTimeLeft(formatTime(diff, '-'));
            }
        };

        tick();
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [targetTime]);

    if (!timeLeft) return null;

    if (variant === 'minimal') {
        return (
            <span className={`font-sans font-bold tracking-tight ${status === 'active' ? 'text-inherit' : 'opacity-80'} ${className}`}>
                {timeLeft}
            </span>
        );
    }

    return (
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between border shadow-sm transition-colors duration-500 ${status === 'active'
            ? 'bg-success/5 border-success/20'
            : 'bg-surface border-black/5'
            } ${className}`}>
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
                    <div className="text-xl font-bold font-sans text-text-inverse tabular-nums leading-none mt-0.5">
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
