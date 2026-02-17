import { useState, useEffect } from 'react';
import { User, Ruler, Weight, Activity, Save, ChevronRight, Stethoscope, Pill, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getProfile, saveProfile, UserProfile } from '../lib/storage';

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile>({
        gender: 'male',
        height: 175,
        weight: 70,
        bodyFat: 15
    });

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const p = getProfile();
        if (p) setProfile(p);
    }, []);

    const handleSave = () => {
        saveProfile(profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updateMatches = (key: keyof UserProfile, value: any) => {
        setProfile(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 pb-32 flex-1 flex flex-col font-sans min-h-screen text-text bg-background overflow-y-auto">
            <header className="mb-8 pt-6 shrink-0">
                <h1 className="text-3xl font-bold font-display text-text leading-none mb-1">Athlete Profile</h1>
                <p className="text-text/60 font-sans text-xs uppercase tracking-wider">Configuration & Health</p>
            </header>

            <div className="space-y-6">

                {/* Avatar / Header */}
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary border-2 border-primary/20 flex items-center justify-center relative overflow-hidden shadow-sm text-3xl font-display font-bold text-onPrimary">
                        R
                    </div>
                    <div>
                        <div className="text-sm text-text/60 font-bold uppercase tracking-wider mb-1">Status</div>
                        <div className="text-xl font-medium text-primary">Biological Protocol Ready</div>
                    </div>
                </div>

                {/* Medical Context Hub */}
                <div className="grid gap-3">
                    <button
                        onClick={() => navigate('/profile/diagnosis')}
                        className="bg-surface text-text-inverse p-5 rounded-2xl border border-black/5 flex items-center justify-between group active:scale-[0.98] transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <Stethoscope size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">Diagnoses</div>
                                <div className="text-xs text-text-inverse/60 font-medium">
                                    {profile.diagnoses?.length ? `${profile.diagnoses.length} Active` : 'None Set'}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-text-inverse/30" />
                    </button>

                    <button
                        onClick={() => navigate('/profile/medications')}
                        className="bg-surface text-text-inverse p-5 rounded-2xl border border-black/5 flex items-center justify-between group active:scale-[0.98] transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Pill size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">Medications</div>
                                <div className="text-xs text-text-inverse/60 font-medium">
                                    {profile.medications?.length ? `${profile.medications.length} Active` : 'None Set'}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-text-inverse/30" />
                    </button>

                    <button
                        onClick={() => navigate('/profile/supplements')}
                        className="bg-surface text-text-inverse p-5 rounded-2xl border border-black/5 flex items-center justify-between group active:scale-[0.98] transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                                <Zap size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">Supplements</div>
                                <div className="text-xs text-text-inverse/60 font-medium">
                                    {profile.supplements?.length ? `${profile.supplements.length} Active` : 'None Set'}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-text-inverse/30" />
                    </button>
                </div>

                {/* Biometrics Form */}
                <div className="bg-surface text-text-inverse rounded-[2rem] p-6 space-y-6 shadow-sm border border-black/5">
                    <h2 className="text-lg font-bold text-main mb-4 flex items-center gap-2">
                        <Activity className="text-primary" size={20} />
                        Biometrics
                    </h2>

                    {/* Gender */}
                    <div>
                        <label className="text-secondary text-sm font-bold uppercase tracking-wider mb-2 block">Biological Sex</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['male', 'female'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => updateMatches('gender', g)}
                                    className={`py-3 rounded-xl font-medium capitalize transition shadow-sm ${profile.gender === g
                                        ? 'bg-primary text-onPrimary shadow-primary/30'
                                        : 'bg-background text-text hover:bg-white/5'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Height & Weight Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-secondary text-sm font-bold uppercase tracking-wider mb-2 block flex items-center gap-1"><Ruler size={14} /> Height (cm)</label>
                            <input
                                type="number"
                                value={profile.height}
                                onChange={(e) => updateMatches('height', Number(e.target.value))}
                                className="w-full bg-background rounded-xl p-3 text-white text-lg font-medium focus:ring-2 ring-primary outline-none transition border border-black/5"
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-sm font-bold uppercase tracking-wider mb-2 block flex items-center gap-1"><Weight size={14} /> Weight (kg)</label>
                            <input
                                type="number"
                                value={profile.weight}
                                onChange={(e) => updateMatches('weight', Number(e.target.value))}
                                className="w-full bg-background rounded-xl p-3 text-white text-lg font-medium focus:ring-2 ring-primary outline-none transition border border-black/5"
                            />
                        </div>
                    </div>

                    {/* Body Fat */}
                    <div>
                        <label className="text-secondary text-sm font-bold uppercase tracking-wider mb-2 block">Est. Body Fat %</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="5" max="40"
                                value={profile.bodyFat || 15}
                                onChange={(e) => updateMatches('bodyFat', Number(e.target.value))}
                                className="flex-1 accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="w-16 bg-background rounded-xl p-2 text-center font-bold text-white border border-black/5">
                                {profile.bodyFat || 15}%
                            </div>
                        </div>
                    </div>

                    {/* Intolerances & Triggers */}
                    <div className="pt-4 border-t border-black/5">
                        <label className="text-secondary text-xs uppercase font-bold tracking-wider mb-4 block">Intolerances & Triggers</label>

                        <div className="space-y-3 mb-4">
                            {(profile.intolerances || []).map((item, idx) => (
                                <div key={idx} className="bg-background rounded-xl p-3 flex items-center justify-between border border-black/5">
                                    <span className="font-bold text-white">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={item.severity}
                                            onChange={(e) => {
                                                const val = e.target.value as any;
                                                const updated = [...(profile.intolerances || [])];
                                                updated[idx].severity = val;
                                                updateMatches('intolerances', updated);
                                            }}
                                            className="bg-surface text-secondary text-xs font-bold uppercase py-1.5 px-3 rounded-lg border-none outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="mild">Mild</option>
                                            <option value="moderate">Mod.</option>
                                            <option value="severe">Severe</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                const updated = (profile.intolerances || []).filter((_, i) => i !== idx);
                                                updateMatches('intolerances', updated);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 text-secondary hover:text-error transition"
                                        >
                                            <div className="text-xl leading-none">×</div>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add New Trigger */}
                        <div className="flex gap-2">
                            <input
                                id="new-trigger"
                                type="text"
                                placeholder="Add trigger (e.g. Dairy)"
                                className="flex-1 bg-background rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 border border-black/5 text-sm font-medium text-white placeholder:text-white/50"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        const val = target.value.trim();
                                        if (val) {
                                            const current = profile.intolerances || [];
                                            if (!current.some(i => i.name.toLowerCase() === val.toLowerCase())) {
                                                updateMatches('intolerances', [...current, { name: val, severity: 'moderate' }]);
                                                target.value = '';
                                            }
                                        }
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const input = document.getElementById('new-trigger') as HTMLInputElement;
                                    const val = input.value.trim();
                                    if (val) {
                                        const current = profile.intolerances || [];
                                        if (!current.some(i => i.name.toLowerCase() === val.toLowerCase())) {
                                            updateMatches('intolerances', [...current, { name: val, severity: 'moderate' }]);
                                            input.value = '';
                                        }
                                    }
                                }}
                                className="bg-primary text-onPrimary px-5 rounded-xl font-bold"
                            >
                                +
                            </button>
                        </div>

                        {/* Preset Chips */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {['Dairy', 'Gluten', 'Caffeine', 'Fructose', 'FODMAPs', 'Alcohol', 'Spicy Food'].map(p => {
                                const isActive = (profile.intolerances || []).some(i => i.name.toLowerCase() === p.toLowerCase());
                                if (isActive) return null; // Hide if added
                                return (
                                    <button
                                        key={p}
                                        onClick={() => updateMatches('intolerances', [...(profile.intolerances || []), { name: p, severity: 'moderate' }])}
                                        className="type-label bg-surface border border-black/5 px-3 py-1.5 rounded-full text-secondary hover:bg-black/5 transition"
                                    >
                                        + {p}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg ${saved ? 'bg-success text-white' : 'bg-primary text-onPrimary hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
                            }`}
                    >
                        {saved ? <span className="flex items-center gap-2"><User size={20} /> Saved</span> : <span className="flex items-center gap-2"><Save size={20} /> Save Profile</span>}
                    </button>

                </div>
            </div>
        </div>
    );
}
