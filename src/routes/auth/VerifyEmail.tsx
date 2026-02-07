import { Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-white font-sans p-6 flex flex-col justify-center items-center text-center">

            <div className="w-20 h-20 bg-surface/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
                <Mail size={40} />
            </div>

            <h1 className="text-3xl font-display font-bold mb-4">Verify Your Email</h1>

            <p className="text-white/70 max-w-xs mb-8">
                We've sent a verification link to your inbox. Please click it to finish creating your account.
            </p>

            <div className="space-y-4 w-full max-w-xs">
                <div className="bg-surface/5 p-4 rounded-xl text-sm text-white/50 border border-white/5">
                    Didn't receive it? Check your spam folder or try signing in to resend.
                </div>

                <button
                    onClick={() => navigate('/login')}
                    className="w-full py-4 text-primary font-bold hover:bg-white/5 rounded-xl transition flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={18} />
                    Back to Log In
                </button>
            </div>

        </div>
    );
}
