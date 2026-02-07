import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans p-6 flex flex-col justify-center">
            <div className="w-full max-w-sm mx-auto">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center text-onPrimary text-2xl font-display font-bold shadow-lg shadow-primary/30">
                        R
                    </div>
                    <h1 className="text-3xl font-display font-bold mb-2">Welcome Back</h1>
                    <p className="text-white/70">Sign in to continue your progress.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={20} />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-surface border border-black/5 rounded-2xl py-4 pl-12 pr-4 text-text-inverse font-medium outline-none focus:border-primary transition placeholder:text-text-inverse/50"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-surface border border-black/5 rounded-2xl py-4 pl-12 pr-4 text-text-inverse font-medium outline-none focus:border-primary transition placeholder:text-text-inverse/50"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-error/10 text-error text-sm font-bold rounded-xl text-center animate-in fade-in">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-onPrimary font-display font-bold text-xl py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <span>Sign In</span>}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/signup')}
                        className="text-white font-medium hover:text-primary transition"
                    >
                        Don't have an account? <span className="font-bold underline text-primary">Sign Up</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
