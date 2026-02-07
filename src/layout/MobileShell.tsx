import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, User, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function MobileShell() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'home', icon: Home, label: 'Home', path: '/' },
        { id: 'calendar', icon: Calendar, label: 'Planner', path: '/calendar' },
        { id: 'history', icon: ClipboardList, label: 'History', path: '/history' },
        { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <div className="absolute bottom-6 left-0 right-0 z-50 px-6 pointer-events-none">
            <div className="bg-surface/90 backdrop-blur-xl border border-black/5 rounded-[2rem] p-2 flex justify-between items-center shadow-2xl pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300",
                                isActive ? "bg-primary text-onPrimary translate-y-[-8px] shadow-lg shadow-primary/30" : "text-secondary hover:text-text-inverse hover:bg-black/5"
                            )}
                        >
                            <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
                            {isActive && (
                                <span className="absolute -bottom-6 text-[10px] font-bold tracking-widest text-primary uppercase opacity-0 animate-in fade-in slide-in-from-top-2 fill-mode-forwards duration-300">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
