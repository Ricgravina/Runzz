import React from 'react';
import { ChevronDown, Calendar, Clock } from 'lucide-react';

interface DateTimePickerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (isoString: string) => void;
    initialValue?: string; // ISO string
}

export default function DateTimePickerSheet({ isOpen, onClose, onSelect, initialValue }: DateTimePickerSheetProps) {
    if (!isOpen) return null;


    // Initialize with provided value or nearest hour
    const [selectedDate, setSelectedDate] = React.useState(() => {
        if (initialValue) return new Date(initialValue);
        const d = new Date();
        d.setMinutes(0, 0, 0); // Reset to top of hour
        d.setHours(d.getHours() + 1); // Next hour
        return d;
    });

    const [tempTime, setTempTime] = React.useState(() => {
        return selectedDate.toTimeString().slice(0, 5); // HH:MM
    });



    const handleConfirm = () => {
        // combine selectedDate (YMD) with tempTime (HM)
        const [h, m] = tempTime.split(':').map(Number);
        const final = new Date(selectedDate);
        final.setHours(h, m, 0, 0);

        // Adjust for timezone offset to get ISO string correct local time preservation?
        // Actually, just returning simplified ISO is risky if logic expects local.
        // Let's rely on standard ISO but ensure we constructed it right locally.
        // construct local ISO: YYYY-MM-DDTHH:MM
        const offset = final.getTimezoneOffset() * 60000;
        const localISO = (new Date(final.getTime() - offset)).toISOString().slice(0, 16);

        onSelect(localISO);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-text-inverse font-display">Time & Date</h3>
                    <button onClick={onClose} className="bg-black/5 p-2 rounded-full text-text-inverse hover:text-text-inverse/80 transition">
                        <span className="sr-only">Close</span>
                        <ChevronDown size={24} />
                    </button>
                </div>

                {/* Date Selection (Native Picker) */}
                <div className="mb-6">
                    <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Calendar size={14} /> Date
                    </div>
                    <div className="bg-surface rounded-2xl p-4 flex items-center justify-center border border-black/5 relative overflow-hidden h-20">
                        {/* Styled Wrapper */}
                        <div className="flex items-center gap-3 relative z-10 pointer-events-none">
                            <span className="text-2xl font-display font-bold text-secondary">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>

                        <input
                            type="date"
                            value={selectedDate.toISOString().split('T')[0]}
                            onChange={(e) => {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                const newDate = new Date(selectedDate);
                                newDate.setFullYear(y, m - 1, d);
                                setSelectedDate(newDate);
                            }}
                            className="absolute inset-0 opacity-0 w-full h-full z-20 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Time Selection (Wheel Sim) */}
                <div className="mb-8">
                    <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Clock size={14} /> Start Time
                    </div>
                    <div className="bg-surface rounded-2xl p-4 flex items-center justify-center border border-black/5 relative overflow-hidden h-32">
                        {/* Selected Highlight */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-black/5 rounded-xl pointer-events-none"></div>

                        <input
                            type="time"
                            value={tempTime}
                            onChange={(e) => setTempTime(e.target.value)}
                            className="text-4xl font-display font-bold bg-transparent outline-none text-text-inverse z-10 text-center w-full appearance-none relative"
                        />
                        {/* Note: Native time picker is actually decent on mobile usually, but maybe wrapping it like this is nicer aesthetically? */}
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    className="w-full bg-primary text-onPrimary py-5 rounded-2xl font-bold text-xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition"
                >
                    Confirm Time
                </button>

            </div>
        </div>
    );
}
