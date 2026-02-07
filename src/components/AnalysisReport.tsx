import { LogEntry } from '../lib/storage';

export const AnalysisReport = ({ analysis }: { analysis: NonNullable<LogEntry['analysis']> }) => {
    return (
        <div className="bg-surface rounded-3xl p-6 text-sm font-sans animate-in slide-in-from-top-2 shadow-sm border border-white/40 text-text-inverse">

            {/* Header / Summary */}
            <div className="mb-6">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-2">Protocol Execution Summary</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-text-inverse/60 text-xs">Readiness</div>
                        <div className="text-xl font-bold text-primary flex items-baseline gap-1">
                            {analysis.readiness} <span className="text-xs text-text-inverse/40 font-normal">/ 10</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-text-inverse/60 text-xs">Adherence</div>
                        <div className="text-xl font-bold text-primary">{analysis.adherence}%</div>
                    </div>
                </div>
                <div className="space-y-1">
                    <p><span className="text-text-inverse/60">Outcome:</span> <span className="text-text-inverse font-medium">{analysis.outcome}</span></p>
                    <p><span className="text-text-inverse/60">Risk:</span> <span className="text-text-inverse font-medium">{analysis.riskLevel}</span></p>
                </div>
            </div>

            <hr className="border-text-inverse/10 my-5" />

            {/* Deviations */}
            <div className="mb-6">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3">Observed Deviations & Signals</div>
                <div className="space-y-4">
                    {analysis.deviations.map((dev, i) => (
                        <div key={i}>
                            <div className="text-error font-bold mb-1">{dev.title}</div>
                            <ul className="list-disc list-outside ml-4 space-y-0.5 text-text-inverse/80">
                                {dev.details.map((d, j) => <li key={j}>{d}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-text-inverse/10 my-5" />

            {/* Interpretation */}
            <div className="mb-6">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3">Interpretation Logic</div>
                <div className="space-y-3">
                    <div>
                        <div className="text-text-inverse/60 text-xs mb-0.5">Primary Finding</div>
                        <div className="text-text-inverse font-medium">{analysis.interpretation.primary}</div>
                    </div>
                    <div>
                        <div className="text-text-inverse/60 text-xs mb-0.5">Supporting Signals</div>
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-text-inverse/80">
                            {analysis.interpretation.signals.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <div className="text-text-inverse/60 text-xs mb-0.5">Likely Contributors</div>
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-text-inverse/80">
                            {analysis.interpretation.contributors.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <div className="text-text-inverse/60 text-xs mb-0.5">What this is NOT</div>
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-text-inverse/60 italic">
                            {analysis.interpretation.negatives.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                </div>
            </div>

            <hr className="border-text-inverse/10 my-5" />

            {/* Recommendations */}
            <div className="mb-6">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3">Recommendations (Next Iteration)</div>
                <div className="space-y-4">
                    {analysis.recommendations.map((rec, i) => (
                        <div key={i}>
                            <div className="text-text-inverse font-bold mb-1 border-l-2 border-primary pl-2">{rec.category}</div>
                            <ul className="list-disc list-outside ml-4 space-y-0.5 text-text-inverse/80">
                                {rec.items.map((it, j) => <li key={j}>{it}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-text-inverse/10 my-5" />

            {/* Confidence */}
            <div className="mb-6">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-3">Confidence Assessment</div>
                <div className="space-y-1">
                    <p><span className="text-text-inverse/60">Stability:</span> <span className="text-text-inverse">{analysis.confidence.stability}</span></p>
                    <p><span className="text-text-inverse/60">Fueling Risk:</span> <span className="text-text-inverse">{analysis.confidence.fuelingRisk}</span></p>
                    <p><span className="text-text-inverse/60">Change Need:</span> <span className="text-text-inverse">{analysis.confidence.changeNeed}</span></p>
                </div>
            </div>

            <hr className="border-text-inverse/10 my-5" />

            {/* Coach Note - Fixed Overflow */}
            <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                <div className="text-xs font-bold text-text-inverse/60 uppercase tracking-widest mb-2">Coach Note</div>
                <div className="text-text-inverse italic font-medium leading-relaxed whitespace-pre-wrap break-words">
                    "{analysis.coachNote}"
                </div>
            </div>

        </div>
    );
};
