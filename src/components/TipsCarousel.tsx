import { useEffect, useState, useRef } from 'react';
import { getAggregatedTips, InsightTip } from '../lib/storage';
import { Lightbulb, ChevronRight, ChevronLeft, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TipsCarousel() {
    const navigate = useNavigate();
    const [tips, setTips] = useState<InsightTip[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        setTips(getAggregatedTips());
    }, []);

    // Intersection Observer to track active center slide
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || tips.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    if (!isNaN(index)) {
                        setActiveIndex(index);
                    }
                }
            });
        }, {
            root: container,
            threshold: 0.6 // 60% visibility required to be "active"
        });

        itemsRef.current.forEach(item => {
            if (item) observer.observe(item);
        });

        return () => observer.disconnect();
    }, [tips]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const width = scrollRef.current.clientWidth * 0.85; // match item width
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -width : width,
            behavior: 'smooth'
        });
    };

    if (tips.length === 0) return null;

    return (
        <div className="col-span-2">

            {/* Header / Controls */}
            <div className="flex items-center justify-between px-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                        <Lightbulb size={12} />
                    </div>
                    <span className="text-secondary font-bold uppercase tracking-wider text-[10px]">Coach Insights</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="w-8 h-8 rounded-full bg-surface shadow-sm border border-black/5 flex items-center justify-center text-secondary hover:text-text-inverse transition active:bg-black/5"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="w-8 h-8 rounded-full bg-surface shadow-sm border border-black/5 flex items-center justify-center text-secondary hover:text-text-inverse transition active:bg-black/5"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Scroll Track */}
            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 no-scrollbar"
                style={{ scrollPaddingLeft: '24px', scrollPaddingRight: '24px' }}
            >
                {tips.map((tip, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <div
                            key={i}
                            data-index={i}
                            ref={el => itemsRef.current[i] = el}
                            className={`w-[85%] shrink-0 snap-center first:pl-0 last:pr-6 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95 blur-[1px]'}`}
                        >
                            <button
                                onClick={() => navigate(`/report/${tip.sourceLogId}`)}
                                className="w-full bg-surface border border-white/40 rounded-[2rem] p-6 shadow-sm overflow-hidden relative group text-left transition hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {/* Decoration */}
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Quote size={60} />
                                </div>

                                <div className="text-secondary font-bold leading-none text-xs mb-3 uppercase tracking-wide opacity-60">
                                    {tip.category}
                                </div>

                                <div className="min-h-[60px] flex items-center mb-2">
                                    <p className="text-base font-medium text-text-inverse leading-relaxed italic line-clamp-4">
                                        "{tip.text}"
                                    </p>
                                </div>

                                <div className="text-[10px] text-secondary font-mono mt-2">
                                    {new Date(tip.date).toLocaleDateString('en-GB')}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
