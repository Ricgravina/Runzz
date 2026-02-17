import { TimelinePlan } from '../lib/recommendations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProtocolOverviewProps {
    plan: TimelinePlan;
    leadTimeDays: number;
    intensity: string;
    gutScale: number;
}

export default function ProtocolOverview({ plan, leadTimeDays, intensity, gutScale }: ProtocolOverviewProps) {
    // Generate summary paragraph
    const generateSummary = (): string => {
        const isHighIntensity = intensity === 'max_effort' || intensity === 'threshold';
        const isGutSensitive = gutScale >= 6;

        let summary = `Your ${leadTimeDays}-day protocol is designed to optimize performance while managing gut health. `;

        if (isHighIntensity) {
            summary += `Given the high-intensity nature of your event, the plan emphasizes a strategic taper to shed fatigue while maintaining sharpness. `;
        } else {
            summary += `The plan focuses on maintaining aerobic fitness while ensuring digestive stability. `;
        }

        if (isGutSensitive) {
            summary += `With your current gut sensitivity, we've prioritized low-FODMAP nutrition, strategic hydration timing, and recovery protocols to minimize GI distress. `;
        } else {
            summary += `Nutrition and hydration are optimized for sustained energy without overwhelming your system. `;
        }

        summary += `Training intensity gradually decreases as you approach event day, while calorie and hydration targets are carefully calibrated to support recovery and readiness.`;

        return summary;
    };

    // Extract chart data from timeline
    const generateChartData = () => {
        const eventItem = plan.timeline.find(item => item.label === "Start Time");
        const eventDate = eventItem?._timestamp ? new Date(eventItem._timestamp) : new Date();

        // Group events by day and calculate metrics
        const dayMetrics: { [key: number]: { intensity: number; calories: number; hydration: number; count: number } } = {};

        plan.timeline.forEach(item => {
            if (!item._timestamp) return;

            const itemDate = new Date(item._timestamp);
            const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            const currentDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            const daysDiff = Math.round((eventDay.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24));

            if (!dayMetrics[daysDiff]) {
                dayMetrics[daysDiff] = { intensity: 0, calories: 0, hydration: 0, count: 0 };
            }

            // Estimate intensity based on event type and label
            if (item.type === 'training') {
                if (item.label.includes('T-14') || item.label.includes('T-13') || item.label.includes('T-12') || item.label.includes('T-11')) {
                    dayMetrics[daysDiff].intensity += 90; // Peak volume
                } else if (item.label.includes('T-10') || item.label.includes('T-9') || item.label.includes('T-8')) {
                    dayMetrics[daysDiff].intensity += 75; // Structural maintenance
                } else if (daysDiff > 3) {
                    dayMetrics[daysDiff].intensity += 60; // Taper
                } else if (daysDiff > 0) {
                    dayMetrics[daysDiff].intensity += 40; // Final taper
                } else {
                    dayMetrics[daysDiff].intensity += 100; // Event day
                }
            }

            // Estimate calories (higher during peak, moderate during taper)
            if (item.type === 'nutrition') {
                if (daysDiff > 7) {
                    dayMetrics[daysDiff].calories += 2800;
                } else if (daysDiff > 3) {
                    dayMetrics[daysDiff].calories += 2500;
                } else if (daysDiff > 0) {
                    dayMetrics[daysDiff].calories += 2200;
                } else {
                    dayMetrics[daysDiff].calories += 2000;
                }
            }

            // Estimate hydration (consistent, slightly higher near event)
            if (item.type === 'hydration' || item.type === 'nutrition') {
                if (daysDiff <= 2) {
                    dayMetrics[daysDiff].hydration += 3.5;
                } else {
                    dayMetrics[daysDiff].hydration += 3.0;
                }
            }

            dayMetrics[daysDiff].count++;
        });

        // Convert to array and average values
        const chartData = Object.keys(dayMetrics)
            .map(key => {
                const day = parseInt(key);
                const metrics = dayMetrics[day];
                return {
                    day: day === 0 ? 'EVENT' : `T-${day}`,
                    dayNum: -day, // For sorting (negative so event day is last)
                    intensity: Math.round(metrics.intensity / Math.max(metrics.count, 1)),
                    calories: Math.round(metrics.calories / Math.max(metrics.count, 1)),
                    hydration: parseFloat((metrics.hydration / Math.max(metrics.count, 1)).toFixed(1))
                };
            })
            .sort((a, b) => b.dayNum - a.dayNum); // Sort from earliest to event day

        return chartData;
    };

    const summary = generateSummary();
    const chartData = generateChartData();

    return (
        <div className="bg-surface rounded-[3rem] p-8 mb-6 border border-black/5 shadow-sm">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-secondary uppercase tracking-widest text-[10px] font-sans font-bold mb-3">Protocol Overview</h3>
                <p className="text-text-inverse text-base leading-relaxed font-sans">
                    {summary}
                </p>
            </div>

            {/* Chart */}
            <div className="bg-black/5 rounded-2xl p-6">
                <h4 className="text-text-inverse/60 uppercase tracking-wider text-[9px] font-sans font-bold mb-4">Key Metrics Over Time</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C8FF00" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#C8FF00" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorHydration" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="day"
                            stroke="rgba(255,255,255,0.4)"
                            style={{ fontSize: '10px', fontFamily: 'Space Grotesk' }}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.4)"
                            style={{ fontSize: '10px', fontFamily: 'Space Grotesk' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a3a2e',
                                border: '1px solid rgba(200, 255, 0, 0.2)',
                                borderRadius: '12px',
                                fontSize: '12px'
                            }}
                            labelStyle={{ color: '#C8FF00', fontWeight: 'bold' }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '11px', fontFamily: 'Space Grotesk' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="intensity"
                            stroke="#C8FF00"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorIntensity)"
                            name="Intensity (%)"
                        />
                        <Area
                            type="monotone"
                            dataKey="calories"
                            stroke="#FF6B6B"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCalories)"
                            name="Calories (kcal/100)"
                            scale="linear"
                        />
                        <Area
                            type="monotone"
                            dataKey="hydration"
                            stroke="#4ECDC4"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorHydration)"
                            name="Hydration (L)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
