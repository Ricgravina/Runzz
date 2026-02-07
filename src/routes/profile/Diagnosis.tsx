import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, CheckCircle } from 'lucide-react';
import { getProfile, saveProfile, UserProfile } from '../../lib/storage';

export default function Diagnosis() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const p = getProfile();
        setProfile(p || { gender: 'male', weight: 70, height: 175, diagnoses: [], customChips: [] });
    }, []);

    const handleToggle = (item: string) => {
        if (!profile) return;
        const current = profile.diagnoses || [];
        const next = current.includes(item)
            ? current.filter(i => i !== item)
            : [...current, item];

        const updated = { ...profile, diagnoses: next };
        setProfile(updated);
        saveProfile(updated);
    };

    const handleAddCustom = () => {
        if (!searchTerm.trim() || !profile) return;
        const custom = profile.customChips || [];
        // Prevent duplicates
        if (custom.some(c => c.label.toLowerCase() === searchTerm.toLowerCase())) return;

        const updated = {
            ...profile,
            diagnoses: [...(profile.diagnoses || []), searchTerm],
            customChips: [...custom, { category: 'diagnosis' as const, label: searchTerm }]
        };

        setProfile(updated);
        saveProfile(updated);
        setSearchTerm('');
    };

    if (!profile) return null;

    const commonConditions = [
        "IBS-D (Diarrhea-predominant)",
        "IBS-C (Constipation-predominant)",
        "IBS-M (Mixed IBS)",
        "Crohn's Disease",
        "Ulcerative Colitis",
        "Exercise-induced GI distress"
    ];

    return (
        <div className="p-6 min-h-screen bg-background text-text font-sans">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-surface text-text-inverse border border-black/5 flex items-center justify-center">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black">Diagnoses</h1>
            </header>

            <div className="space-y-6">
                <div>
                    <p className="text-text/60 mb-4 text-sm font-medium">Select all that apply. This helps us tailor hydration and intensity guardrails.</p>
                    <div className="space-y-3">
                        {commonConditions.map(condition => {
                            const isSelected = profile.diagnoses?.includes(condition);
                            return (
                                <button
                                    key={condition}
                                    onClick={() => handleToggle(condition)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-black/5'}`}
                                >
                                    <span className={`font-bold ${isSelected ? 'text-secondary' : 'text-text-inverse'}`}>{condition}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white' : 'border-black/10'}`}>
                                        {isSelected && <CheckCircle size={14} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Section */}
                <div className="mt-8 pt-8 border-t border-black/5">
                    <h3 className="font-bold text-lg mb-4">Other Conditions</h3>

                    {/* Render relevant custom chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {profile.customChips?.filter(c => c.category === 'diagnosis').map(chip => (
                            <button
                                key={chip.label}
                                onClick={() => handleToggle(chip.label)}
                                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border ${profile.diagnoses?.includes(chip.label) ? 'bg-primary/10 border-primary text-secondary' : 'bg-surface border-black/5 text-secondary'}`}
                            >
                                {chip.label}
                                {profile.diagnoses?.includes(chip.label) && <X size={14} className="opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleToggle(chip.label); }} />}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Add another..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                            className="w-full bg-surface border border-black/5 rounded-2xl py-4 pl-12 pr-12 font-bold text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {searchTerm && (
                            <button
                                onClick={handleAddCustom}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-onPrimary p-2 rounded-xl"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
