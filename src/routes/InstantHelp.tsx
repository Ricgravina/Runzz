
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';

export default function InstantHelp() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: "Hi, I'm RUNZZ. Describe your situation and I'll see how I can help." }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Simulated AI Delay
        setTimeout(() => {
            const response = generateAIResponse(userMsg);
            setMessages(prev => [...prev, { role: 'assistant', text: response }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-screen bg-background text-text font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 pt-10 shrink-0">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center text-text hover:bg-surface/20 transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold font-display text-text">Instant Help</h1>
                    <div className="flex items-center gap-2 text-xs font-mono text-text/60 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        AI Online
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-2xl text-lg leading-snug ${msg.role === 'user'
                            ? 'bg-secondary text-white rounded-tr-sm'
                            : 'bg-surface text-text-inverse rounded-tl-sm'
                            }`}>
                            <div className="whitespace-pre-wrap">
                                {msg.text.split('\n').map((line, i) => (
                                    <span key={i} className="block mb-1">
                                        {line.startsWith('**') ? <strong>{line.replace(/\*\*/g, '')}</strong> :
                                            line.startsWith('>') ? <span className="bg-white/10 block p-2 rounded-lg italic border-l-2 border-primary">{line.replace('>', '')}</span> :
                                                line.startsWith('*') ? <li className="ml-4 list-disc">{line.replace('*', '')}</li> :
                                                    line}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 p-4 rounded-2xl rounded-tl-sm flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 pb-8 shrink-0 bg-text/50 backdrop-blur-md border-t border-white/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your situation..."
                        className="w-full bg-white/10 text-white placeholder-white/40 rounded-full py-4 pl-6 pr-14 text-lg outline-none focus:bg-white/20 transition border border-white/10"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-onPrimary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div >
    );
}

// Simple heuristic "AI" response generator
function generateAIResponse(input: string): string {
    const lower = input.toLowerCase();

    // Markdown-lite formatting for rich layout
    // Use **bold**, \n for newlines, > for callouts

    // Emergency / Pain
    if (lower.includes('pain') || lower.includes('cramp') || lower.includes('hurt') || lower.includes('blood') || lower.includes('sharp')) {
        return `**⚠️ Risk Assessment: High**

We need to be careful here. Sharp pain is a stop signal.

> **Recommendation**
> Stop activity immediately. Walk to cool down.

**Action Plan:**
*   **Hydration**: Sip water slowly.
*   **Check**: Do you feel dizzy?
*   **Next**: If pain persists >10 mins, head home.`;
    }

    // Fatigue
    if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('exhausted') || lower.includes('weak')) {
        return `**📉 Energy Analysis**

Fatigue is a valid physiological signal, likely inflammation-related.

> **Coach Decision**
> Downgrade today's session to **Zone 1 Recovery** or Rest.

**Why?**
Pushing through fatigue today increases flair risk by 40%. Sleep is your priority right now.`;
    }

    // Nutrition
    if (lower.includes('food') || lower.includes('eat') || lower.includes('hungry') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast')) {
        return `**🍽️ Fueling Strategy**

Your gut sounds sensitive. Let's aim for **Low Residue**.

**Approved Menu:**
*   🍚 White Rice / Sourdough
*   🥚 Eggs / Lean Chicken
*   🍌 Ripe Bananas

**Avoid Today:**
*   ❌ Caffeine
*   ❌ Raw Vegetables
*   ❌ Dairy (unless lactose free)`;
    }

    // Urgency
    if (lower.includes('bathroom') || lower.includes('urgency') || lower.includes('poop') || lower.includes('toilet') || lower.includes('run') || lower.includes('trots')) {
        return `**🚽 Urgency Management**

**Protocol Adjustment:**
1.  **Route**: Stay within 1km loop of home.
2.  **Intensity**: Cap at **Zone 1**. High intensity triggers motility.
3.  **Timing**: Wait 30 mins post-meal before starting.

> **Tip**
> If urgency is >6/10, consider indoor cross-training instead.`;
    }

    // General Training
    if (lower.includes('run') || lower.includes('train') || lower.includes('workout') || lower.includes('exercise')) {
        return `**🏃 Training Guidance**

Unsure about today? Let's verify readiness.

**The 10-Minute Rule:**
Start a warm-up walk/jog for 10 minutes.
*   **Better/Same?** Continue.
*   **Worse?** Stop immediately.

**Goal**: Consistency > Intensity today.`;
    }

    // Fallback
    return `**🤖 RUNZZ Intelligence**

I am calibrated for **Gut Health, Nutrition, and Training** decisions.

**Try asking:**
*   "What should I eat before my run?"
*   "I have cramps, should I stop?"
*   "Manage my fatigue."`;
}
