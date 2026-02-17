import { LogEntry, UserProfile, getProfile } from "./storage";

export interface TimelineEvent {
    timeMarkup: string; // HH:MM
    label: string;      // e.g., "Start Time", "Nutrition"
    title: string;
    details: string[];
    type: 'nutrition' | 'hydration' | 'training' | 'recovery';
    status: 'completed' | 'active' | 'upcoming';
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors?: string[];
    _timestamp?: number; // Internal for sorting
}

export interface TimelinePlan {
    headline: string;
    theme: 'green' | 'yellow' | 'red' | 'black' | 'gold';
    timeline: TimelineEvent[];
    memoryContext?: string;
}

export const generateTimeline = (
    sessionTime: LogEntry['sessionTime'],
    intensity: LogEntry['intensity'],
    duration: LogEntry['duration'],
    gutScale: number,
    _symptoms: string[],
    history: LogEntry[] = [],
    referenceTime: number = Date.now(),
    overrideOffsetMinutes?: number,
    overrideDurationMinutes?: number,
    profile: UserProfile | null = null,
    travel?: LogEntry['travel'],
    leadTimeDays: number = 3 // Default to full 3-day prep
): TimelinePlan => {

    const events: TimelineEvent[] = [];

    // Default Profile Fallback
    // Default Profile Fallback
    const user: UserProfile = profile || { weight: 70, gender: 'male', height: 175, adhocEvents: [], intolerances: [] };

    // --- DOSING CALCULATOR ---
    const getCarbDose = (perKg: number) => Math.round(user.weight * perKg);
    const getProteinDose = (perKg: number) => Math.round(user.weight * perKg);

    // const fluidBase = 500;
    // const fluidScaler = user.weight > 60 ? (user.weight - 60) * 5 : 0;
    // const preLoadFluid = fluidBase + fluidScaler; // TODO: Use this?

    // --- TIME CALCULATION HELPERS ---
    const formatTime = (ms: number) => {
        return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getHour = (ms: number) => {
        return new Date(ms).getHours();
    };

    // Estimate Event Start (Use override if provided, else bucket)
    // If overrideOffsetMinutes is defined, use it!
    const effectiveOffset = overrideOffsetMinutes !== undefined
        ? overrideOffsetMinutes
        : (sessionTime === '1hr' ? 60 : sessionTime === '2hr+' ? 120 : 0);

    // Helpers for Event Creation with Status
    const createEvent = (offsetMins: number, label: string, title: string, type: TimelineEvent['type'], details: string[], overrideRisk?: TimelineEvent['riskLevel']): TimelineEvent => {
        const isIBSD = (profile?.diagnoses?.some(d => d.includes('IBS-D')) || false); // Re-derived locally for now or move scope up later
        const isPrepDay = sessionTime === 'race_prep_72h' && offsetMins > 10000;
        let timeMarkup = "";
        let eventTimeMs = 0;

        if (isPrepDay) {
            timeMarkup = "Day -3";
            eventTimeMs = referenceTime - 10000000; // Arbitrary past
        } else if (Math.abs(offsetMins - effectiveOffset + (48 * 60)) < 15) {
            timeMarkup = "T-48h"; // Rough way to label early days?
            // Actually, formatTime works fine for exact times.
            // But for multi-day, we might want "Sat 09:00".
            // For now, standard HH:MM is acceptable as the 'Date' is implicit or shown in details.
            // Let's stick to standard format logic:
            eventTimeMs = referenceTime + (offsetMins * 60 * 1000);
            const d = new Date(eventTimeMs);
            // If different day, show day?
            const refDay = new Date(referenceTime).getDay();
            const evtDay = d.getDay();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            if (refDay !== evtDay) {
                timeMarkup = `${days[evtDay]} ${formatTime(eventTimeMs)}`;
            } else {
                timeMarkup = formatTime(eventTimeMs);
            }
        } else {
            eventTimeMs = referenceTime + (offsetMins * 60 * 1000);
            timeMarkup = formatTime(eventTimeMs);
            // Quick fix for days to avoid duplication of logic above
            const d = new Date(eventTimeMs);
            const refDay = new Date(referenceTime).getDay();
            const evtDay = d.getDay();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            if (refDay !== evtDay) {
                timeMarkup = `${days[evtDay]} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
            }
        }

        // Determine Status based on Reference Time (Now)
        // Active Window: Event is "active" if it's within the last 15 mins or next 5 mins?
        // Let's say Active = [Time - 10m, Time + 20m]
        // Completed = Time < Now - 20m
        // Upcoming = Time > Now + 10m

        // Simpler: 
        // Completed: The specific moment has passed significantly (e.g. >15 mins ago)
        // Active: Recently passed or coming up very soon (approx "Now")
        // Upcoming: Future

        let status: TimelineEvent['status'] = 'upcoming';
        const diffMinutes = (eventTimeMs - referenceTime) / 60000;

        if (diffMinutes < -15) {
            status = 'completed';
        } else if (diffMinutes <= 15) {
            status = 'active';
        } else {
            status = 'upcoming';
        }

        // Default Risk Calculation Heuristic
        let riskLevel: TimelineEvent['riskLevel'] = overrideRisk || 'low';
        // Auto-Risk: High Intensity Training is always Medium Risk minimum
        if (type === 'training' && intensity === 'max_effort') riskLevel = 'medium';
        if (type === 'training' && intensity === 'max_effort' && gutScale < 6) riskLevel = 'high';

        // Auto-Risk: Nutrition with Caffeine near bed or if IBS-D
        const factors = [];
        if (title.includes("Caffeine") && isIBSD) {
            riskLevel = 'medium';
            factors.push("Caffeine + IBS-D");
        }

        return { timeMarkup, label, title, type, details, status, riskLevel, riskFactors: factors, _timestamp: eventTimeMs };
    };

    const isSleepTime = (offsetMinutesFromNow: number) => {
        const targetMs = referenceTime + (offsetMinutesFromNow * 60 * 1000);
        const hour = getHour(targetMs);
        return hour >= 23 || hour < 5; // 11PM to 5AM
    };

    // Helper to Cap Dinner Time to 19:00 if it falls later
    const capToDinnerTime = (baseOffset: number): number => {
        const plannedTime = referenceTime + (baseOffset * 60000);
        const d = new Date(plannedTime);
        // If hour is > 19:30 (roughly), clamp to 19:00
        if (d.getHours() >= 20 || (d.getHours() === 19 && d.getMinutes() > 30)) {
            const capped = new Date(d);
            capped.setHours(19, 0, 0, 0);
            return Math.round((capped.getTime() - referenceTime) / 60000);
        }
        return baseOffset;
    };

    // --- 1. STATE IDENTIFICATION ---
    let agpeState = 1;
    if (gutScale >= 9) agpeState = 1;
    else if (gutScale >= 7) agpeState = 2;
    else if (gutScale >= 5) agpeState = 3;
    else if (gutScale >= 3) agpeState = 4;
    else agpeState = 5;

    // --- 2. MEMORY ENGINE ---
    let memoryMessage = "";
    const similarSession = history.find(h =>
        h.intensity === intensity &&
        h.duration === duration &&
        h.gutScale !== undefined &&
        Math.abs(h.gutScale - gutScale) <= 2
    );

    if (similarSession) {
        const date = new Date(similarSession.timestamp).toLocaleDateString();
        memoryMessage = `Recall: On ${date}, you ran a similar protocol at Gut State ${similarSession.gutScale}.`;
    }

    // --- 3. THE GO/NO-GO MATRIX ---
    let theme: TimelinePlan['theme'] = 'green';
    let chatMessage = "";

    if (agpeState <= 2) {
        theme = 'green';
        chatMessage = `Green Zone (State ${agpeState}). Protocol: Performance Optimization.`;
    } else if (agpeState === 3) {
        theme = 'yellow';
        chatMessage = "Yellow Zone. Protocol: Damage Limitation. Prioritizing low residue inputs.";
    } else if (agpeState === 4) {
        theme = 'red';
        chatMessage = "Red Zone. Protocol: Non-Impact Movement Only.";
    } else {
        theme = 'black';
        chatMessage = "Black Zone. Protocol: Immediate Cessation.";
    }

    // --- CALCULATE TIME HORIZON (Moved Up) ---
    // Calculate Calendar Days difference, not just 24h blocks
    // This ensures "Tomorrow morning" counts as Day 1 even if only 12 hours away
    const nowDate = new Date(referenceTime);
    nowDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(referenceTime + (effectiveOffset * 60000));
    targetDate.setHours(0, 0, 0, 0);



    const daysOut = leadTimeDays; // Always use full lead time (14 days), not limited by event proximity



    // --- CONFLICT DETECTION ---
    // If we are in Red/Black zone, we should NOT generate "Standard" nutrition/training for TODAY.
    // They contradict the "System Reset" / "Bowel Rest" advice.
    const isCompromised = theme === 'red' || theme === 'black';

    // Helper to check if an event is "Today" (Standard events only)
    const isToday = (offsetMins: number) => {
        const t = referenceTime + (offsetMins * 60000);
        return new Date(t).getDate() === new Date(referenceTime).getDate();
    };

    // --- 4. PROTOCOL GENERATION (REAL-TIME) ---

    // === BLACK ZONE ===
    if (theme === 'black') {
        events.push(createEvent(0, "Immediate", "System Reset Protocol", "recovery", [
            "CRITICAL WARNING: Your biometric feedback indicates a significant inflammatory flare (State 5). High-intensity stress at this stage will likely accelerate mucosal damage and extend recovery time by days.",
            "IMMEDIATE ACTION: Cease all athletic activity immediately. Assume a supine position to reduce orthostatic stress and redirect blood flow to the splanchnic (gut) bed. Do not attempt to 'push through'.",
            "NUTRITION PROTOCOL: Enter 'Bowel Rest' mode. Consume only warm bone broth or peppermint tea to soothe smooth muscle spasms. Avoid all solids for 12-24 hours to allow the gut lining to repair."
        ]));

        // If event is today, return immediately. If future, continue to generate plan.
        if (daysOut === 0) {
            return { headline: chatMessage, theme: 'red', timeline: events, memoryContext: memoryMessage };
        }
    }

    // === RED ZONE ===
    if (theme === 'red') {
        events.push(createEvent(0, "Now", "Pivot: Active Recovery", "training", [
            "PHYSIOLOGICAL CONTEXT: Your gut is currently in a vulnerable state (State 4). Mechanical impact from running will trigger 'runner's trots' via ischemic reperfusion injury.",
            "MODIFIED PROTOCOL: Switch to Zone 0 walking only. Keep heart rate strictly below 110bpm. This promotes lymphatic drainage without diverting critical blood flow away from the intestines.",
            "DURATION LIMIT: Cap duration at 30 minutes to minimize systemic fatigue."
        ]));
        events.push(createEvent(0, "Nutrition", "Gut Safety Protocol", "nutrition", [
            "RATIONALE: Absorption capacity is compromised. Complex carbohydrates will likely ferment and cause bloating.",
            "FLUID INTAKE: Stick to clear, isotonic fluids. Sip water or weak chamomile tea. Avoid caffeine and artificial sweeteners completely until symptoms subside."
        ]));

        // If event is today, return immediately. If future, continue to generate plan.
        if (daysOut === 0) {
            return { headline: chatMessage, theme, timeline: events, memoryContext: memoryMessage };
        }
    }

    // === GREEN/YELLOW (ACTIVE) ===



    // DOSING MULTIPLIERS (Derived from 75kg Reference)
    const portions = {
        rice: Math.round(user.weight * 4),          // 300g for 75kg
        potatoes: Math.round(user.weight * 4.6),    // 350g for 75kg
        meat: Math.round(user.weight * 2.4),        // 180g for 75kg
        meatSmall: Math.round(user.weight * 2.0),   // 150g for 75kg
        whey: Math.max(Math.round(user.weight * 0.5), 25), // ~40g for 75kg, min 25g
        fastCarbs: Math.round(user.weight * 1.0),   // 75g for 75kg
        waterLarge: Math.round(user.weight * 10),   // 750ml for 75kg
        waterStd: Math.round(user.weight * 6.7),    // 500ml for 75kg
        sodium: Math.round(user.weight * 13)        // ~1000mg for 75kg
    };

    // --- INTOLERANCE FILTERS ---
    const intolerances = user.intolerances || [];
    const isDairyFree = intolerances.some(i => i.name === 'Dairy');
    const isGlutenFree = intolerances.some(i => i.name === 'Gluten');
    const isCaffeineFree = intolerances.some(i => i.name === 'Caffeine');
    const isFructoseFree = intolerances.some(i => i.name === 'Fructose');


    // Helper to swap ingredients
    const safeProtein = isDairyFree ? "Plant-Based Isolate (Pea/Soy)" : "Whey Isolate";
    const safeYogurt = isDairyFree ? "Coconut/Almond Yogurt" : "Greek Yogurt (2-5%)";
    const safeToast = isGlutenFree ? "Gluten-Free Toast" : "White/Sourdough Toast";
    const safePasta = isGlutenFree ? "Rice Noodles/GF Pasta" : "Pasta";
    const safeCasein = isDairyFree ? "Slow-Release Plant Protein" : "Casein or Cottage Cheese";

    // --- T-14 to T-4 DAYS (EXTENDED PREP) ---
    if (daysOut >= 4) {
        for (let d = daysOut; d >= 4; d--) {
            const dayOffset = effectiveOffset - (d * 24 * 60);
            const dayLabel = `T-${d} Days`;

            // Training Suggestion Logic based on phase
            let trainingTitle = "Aerobic Maintenance";
            let trainingDetails = [
                "FOCUS: Maintain aerobic base without accumulating fatigue.",
                "INTENSITY: Zone 2 steady state.",
                "DURATION: 45-60 minutes."
            ];

            if (d > 10) {
                trainingTitle = "Peak Volume Phase";
                trainingDetails = [
                    "FOCUS: This is your final heavy loading block.",
                    "INTENSITY: Include some threshold intervals if feeling good.",
                    "RECOVERY: Ensure sleep is prioritized to absorb this load."
                ];
            } else if (d > 7) {
                trainingTitle = "Structural Maintenance";
                trainingDetails = [
                    "FOCUS: preserve range of motion and tissue quality.",
                    "ACTION: 20 min mobility/stretching routine post-run.",
                    "VOLUME: Begin slight reduction in overall volume (90% of max)."
                ];
            } else {
                trainingTitle = "Taper Initiation";
                trainingDetails = [
                    "FOCUS: Shed fatigue while maintaining sharpness.",
                    "VOLUME: Reduce volume by 40-50% from peak.",
                    "INTENSITY: Keep intensity high but duration short (e.g. 4x3min @ Threshold)."
                ];
            }

            events.push(createEvent(dayOffset, dayLabel, trainingTitle, "training", trainingDetails));

            // Add a nutrition/wellness tip for every other day to not clutter
            if (d % 2 === 0) {
                events.push(createEvent(dayOffset + 600, dayLabel, "Prep Insight", "nutrition", [
                    "TIP: Now is the time to verify your race-day nutrition.",
                    "ACTION: Test your intended breakfast and fueling strategy during training this week.",
                    "GUT CHECK: Eliminate any supplements that have caused issues in the past."
                ]));
            }
        }
    }

    // --- T-72 HOURS (GENERAL PREP) ---
    // If we are 3+ days out, we need instructions for TODAY (Day -3).
    if (daysOut >= 3) {
        // Events for "Today" (approx effectiveOffset - 72h)
        // If effectiveOffset is 72h (4320m), then effectiveOffset - 4320 = 0 (Now)

        if (!isCompromised || !isToday(effectiveOffset - (72 * 60))) {
            events.push(createEvent(effectiveOffset - (72 * 60), "Day -3 Focus", "General Prep & Volume Taper", "training", [
                "TRAINING VOLUME: Volume should decrease by 20-30% starting today to allow glycogen supercompensation.",
                "INTENSITY CHECK: Maintain some race-pace intervals to keep neurological priming, but reduce overall load to prevent systemic fatigue.",
                "GUT PREP: Eliminate high-FODMAP vegetables (onions, garlic, cauliflower) starting now. These foods ferment in the lower bowel and can cause gas/bloating on race day."
            ]));

            events.push(createEvent(effectiveOffset - (72 * 60) + 720, "Day -3 Nutrition", "Carbohydrate Loading Initiation", "nutrition", [
                "NUTRITIONAL OBJECTIVE: Shift macronutrient ratio towards carbohydrates.",
                `CARB TARGET: Aim for ${getCarbDose(7)}g - ${getCarbDose(8)}g of Carbohydrates total today to begin saturating muscle stores.`,
                "HYDRATION STATUS: Increase fluid intake. Urine should be pale yellow."
            ]));
        }
    }

    // --- T-48 HOURS (FOUNDATION) ---
    if (daysOut >= 2) {
        if (!isCompromised || !isToday(effectiveOffset - (48 * 60))) {
            events.push(createEvent(effectiveOffset - (48 * 60), "T-48h Morning", "Foundation Phase: Wake & Hydrate", "hydration", [
                "WAKE TIMING: Within ±30 minutes of target wake time for event day to sync your circadian rhythm.",
                "LIGHT EXPOSURE: View morning sunlight for 5-10 minutes immediately upon waking. This anchors your circadian cortisol pulse, which regulates digestion and bowel motility.",
                `HYDRATION: ${portions.waterStd}ml Water + ~${Math.round(portions.sodium * 0.7)}mg Sodium (approx 1/4 tsp sea salt or electrolytes). Start the day in a eu-hydrated state.`
            ]));

            const bfOptions = [
                `OPTION A: 3 Eggs + 2 Egg Whites + 2 Slices ${safeToast} + 1 tsp Butter.`,
                `OPTION B: 300g ${safeYogurt} + 1.5 tbsp Honey + 1 Small Banana.`
            ];
            if (!isCaffeineFree) bfOptions.push("CAFFEINE: Normal amount. Cut off strictly after 1:00 PM.");

            events.push(createEvent(effectiveOffset - (48 * 60) + 90, "T-48h Breakfast", "Glycogen Refill", "nutrition", [
                "GOAL: Glycogen refill + protein without fiber overload.",
                ...bfOptions
            ]));

            events.push(createEvent(effectiveOffset - (48 * 60) + 360, "T-48h Lunch", "The 'Boring' Anchor Meal", "nutrition", [
                "MEAL OBJECTIVE: Keep glycogen rising while keeping the gut calm.",
                `PROTEIN SOURCE: ${portions.meat}g Grilled Chicken Breast. Simple, low fat.`,
                `CARB SOURCE: ${portions.rice}g White Rice (Cooked Weight). Low fiber, high absorption.`,
                "FAT SOURCE: 1 tbsp Olive Oil.",
                "VEGETABLE LIMIT: Optional 1/2 cup cooked carrots/zucchini. NO raw food (salads) from this point on to minimize gut residue."
            ]));

            events.push(createEvent(capToDinnerTime(effectiveOffset - (48 * 60) + 720), "T-48h Dinner", "Early & Calm", "nutrition", [
                `PROTEIN SOURCE: ${portions.meatSmall}g Salmon or Lean Beef.`,
                `CARB SOURCE: ${portions.potatoes}g Potatoes (Boiled/Roasted - Peeling recommended to remove insoluble fiber).`,
                "FAT SOURCE: 1 tbsp Olive Oil or Butter. Salt generously to aid fluid retention.",
                "GOLDEN RULE: No alcohol. No dessert experiments. Sleep is the priority."
            ]));
        }
    }

    // --- T-24 HOURS (SHARPENING) ---
    if (daysOut >= 1) {
        events.push(createEvent(effectiveOffset - (24 * 60), "T-24h Morning", "Sharpening Phase", "nutrition", [
            `HYDRATION: ${portions.waterStd}ml Water + Electrolytes on waking.`,
            `BREAKFAST (LIGHTER): 3 Eggs + 1-1.5 Slices ${safeToast} + 1 tsp Honey. Reduced volume compared to yesterday to prevent heaviness.`,
            "MOVEMENT: 20-30 min walk or mobility. Finish relaxed, not stimulated. Save the legs."
        ]));

        events.push(createEvent(effectiveOffset - (24 * 60) + 300, "T-24h Lunch", "The Anchor Meal", "nutrition", [
            "CONTEXT: This meal carries you into tomorrow. It is your primary fuel source for the event.",
            `PROTEIN SOURCE: ${portions.meat}g Lean Protein (Chicken/Turkey/Fish). Avoid red meat if digestion is slow.`,
            `CARB SOURCE: ${portions.rice}g White Rice or ${safePasta} (Cooked). Load up here.`,
            "FAT SOURCE: 1 tbsp Olive Oil + Salt well."
        ]));

        events.push(createEvent(capToDinnerTime(effectiveOffset - (24 * 60) + 720), "T-24h Dinner", "Early & Small", "nutrition", [
            "TIMING: Eat earlier than usual to ensure an empty stomach and lower core temperature for sleep.",
            `PROTEIN SOURCE: ${portions.meatSmall}g Protein.`,
            `CARB SOURCE: ${portions.rice - 50}g White Rice or Potatoes. Tapereing off slightly.`,
            "FAT SOURCE: 1 tsp Olive Oil/Butter. kept low to speed gastric emptying.",
            "POST-DINNER ACTIVITY: 10-15 min easy walk to aid gastric emptying and reduce reflux risk."
        ]));
    }

    // STANDARD SESSIONS

    // PRE-SESSION (NUTRITION)
    // If effectiveOffset is large (>90 mins), show -2h meal.
    if (effectiveOffset >= 120) {
        const mealOffset = effectiveOffset - 120; // 2 hrs before start
        const isMiddleOfNight = isSleepTime(mealOffset);

        events.push(createEvent(mealOffset, "Fueling (-2h)", isMiddleOfNight ? "Sleep Hygiene Protocol" : "Primary Fueling Meal", isMiddleOfNight ? "recovery" : "nutrition",
            isMiddleOfNight
                ? [
                    "CIRCADIAN BIOLOGY: Your body is currently prioritizing melatonin. Forcing digestion now effectively gives you 'metabolic jetlag', disrupting your core temperature rhythm.",
                    "SLEEP PRIORITY: Do NOT wake up to eat. Sleep is the ultimate performance enhancer. If you naturally wake up, sip a small amount of liquid carbs, but prioritize rest."
                ]
                : [
                    "MEAL OBJECTIVE: Top up muscle glycogen with minimal digestive stress.",
                    "INTAKE: White Rice + Lean Protein (Chicken/Tofu). Low fat, low fiber. Chew thoroughly.",
                    "BLOOD CHEMISTRY: Salt food liberally to aid water retention and prevent hyponatremia during the sweat session."
                ]
        ));
    }

    // If effectiveOffset is at least 60 mins, show the Top-Up/Pre-Load
    if (effectiveOffset >= 60) {
        const topUpOffset = effectiveOffset - 60;
        events.push(createEvent(topUpOffset, "Pre-Load (-60m)", theme === 'yellow' ? "Low Osmolarity Fueling" : "Glycogen Top-Up", "nutrition",
            theme === 'yellow'
                ? [
                    "SENSITIVITY CONTEXT: Yellow Zone indicates mild gut sensitivity. We need fuel that is easily absorbed to prevent sloshing.",
                    "LIQUID INTAKE: Use Liquid Carbs (Maltodextrin/Cyclic Dextrin) rather than solids. This bypasses mechanical digestion.",
                    "HYDRATION STRATEGY: Sip hypotonic fluids to encourage rapid gastric emptying."
                ]
                : [
                    "PROTOCOL: The 'Top-Up'. A small complex carbohydrate snack to maintain blood glucose and liver glycogen.",
                    isGlutenFree ? "SNACK CHOICE: Ripe banana or GF Oat Bar." : "SNACK CHOICE: Oat bar or ripe banana. Something familiar.",
                    `HYDRATION: Pre-load with ${portions.waterStd}ml fluid + 500mg Sodium to expand plasma volume.`
                ]
        ));
    } else if (effectiveOffset > 15) {
        // If very close (<60 offest from now), allow an immediate small snack
        events.push(createEvent(0, "Immediate", "Last Minute Prime", "nutrition", [
            "TACTIC: There isn't enough time for digestion, but we can use the 'Mouth Rinse' effect.",
            "ACTION: Rinse mouth with a carb solution or consume a small hydrogel. This tricks the brain directly into perceiving fuel availability, reducing perceived exertion."
        ]));
    }

    // DURING (PERFORMANCE)
    // Start Time is simply Now + EffectiveOffset
    events.push(createEvent(effectiveOffset, "Start Time", intensity === 'max_effort' ? "High-Intensity Execution" : "Aerobic Maintenance", "training", [
        intensity === 'max_effort'
            ? "EXECUTION: Warm up for 15 mins. Then target Threshold/VO2 max intervals. Ensure heart rate recovers between sets to flush lactate."
            : "EXECUTION: Maintain a steady output in Zone 2. You should technically be able to hold a conversation, facilitating fat oxidation.",
        gutScale < 7
            ? "SAFETY CONSTRAINT: IBD Safety Valve engaged. If abdominal pain exceeds 4/10, abort the session immediately to prevent flare induction."
            : "GUT STATUS: Stable. You are cleared to push hard."
    ]));

    // Intra-Workout Dosing
    const intraCarbHigh = getCarbDose(1.0); // ~1g/kg/hr for hard sessions? Typical max 90g.
    const intraCarbStd = getCarbDose(0.6); // ~0.6g/kg/hr
    const cappedIntra = Math.min(intraCarbHigh, 90); // Cap at 90g unless elite
    const cappedStd = Math.min(intraCarbStd, 60);

    const fuelingStrategy = [
        "FUELING STRATEGY: The gut is a trainable organ. We need to saturate glucose transporters (SGLT1/GLUT5) to maintain energy flux.",
        `TARGET: Aim for ${intensity === 'max_effort' ? cappedIntra : cappedStd}g Carbs/hr based on your ${user.weight}kg bodyweight.`,
    ];

    if (isFructoseFree) {
        fuelingStrategy.push("INTOLERANCE MODE (No Fructose): Use pure Glucose or Maltodextrin based fuels only. AVOID standard 1:0.8 mixes as they contain fructose.");
    } else if (theme === 'yellow') {
        fuelingStrategy.push("SENSITIVITY MODE: Stick to Cyclic Dextrin (HBCD). Its low osmolarity clears the stomach rapidly, reducing risk of nausea.");
    } else {
        fuelingStrategy.push("STANDARD MODE: Use a 1:0.8 Glucose:Fructose ratio to maximize absorption pathways.");
    }
    fuelingStrategy.push("ELECTROLYTES: 500mg Sodium/L of fluid to replace sweat losses.");

    events.push(createEvent(effectiveOffset + 15, "Intra-Workout", "Fueling Chemistry", "hydration",
        duration === 'short'
            ? [
                "STRATEGY: Duration <60m requires no exogenous fueling. Rely on liver glycogen.",
                "ACTION: Drink water to thirst. Use a mouth rinse if you feel central nervous system fatigue."
            ]
            : fuelingStrategy
    ));

    // POST (RECOVERY)
    // Use overrideDuration if available, else standard fallback
    let durationMinutes = 60;
    if (overrideDurationMinutes !== undefined) {
        durationMinutes = overrideDurationMinutes;
    } else {
        if (duration === 'short') durationMinutes = 45;
        if (duration === 'medium') durationMinutes = 90;
        if (duration === 'long') durationMinutes = 180;
        if (duration === 'ultra') durationMinutes = 240;
    }

    const finishTimeOffset = effectiveOffset + durationMinutes;
    const postProtein = getProteinDose(0.3); // 20-25g typical
    const postCarb = getCarbDose(0.8); // 1g/kg aggressive refuel

    events.push(createEvent(finishTimeOffset, "Finish Line", "The Inflammatory Tail", "recovery", [
        "PHYSIOLOGY: Post-exercise, your body enters an 'open window' of immune suppression and inflammation. Rapid nutrient delivery is key to closing this window.",
        `IMMEDIATE INTAKE: ${Math.max(postProtein, 20)}g ${safeProtein} + ${postCarb}g Fast Carbs (e.g., Haribo, ${safeToast}). Do not wait for the adrenaline to settle.`,
        "THERMOREGULATION: Active cooling (cold shower/ice vest) can help reduce systemic inflammation (IL-6 cytokines)."
    ]));

    // --- RE-FEED Logic ---
    const reFeedOffset = finishTimeOffset + 60;
    const isLateNight = isSleepTime(reFeedOffset);

    events.push(createEvent(reFeedOffset, "Re-Feed", isLateNight ? "Overnight Recovery" : "Mucosal Repair", isLateNight ? "recovery" : "nutrition",
        isLateNight
            ? [
                "PRIORITY: Sleep architecture > Caloric timing.",
                `INTAKE: If hungry, ${safeCasein} is optimal. Avoid heavy meals that increase core body temperature.`,
                "ENVIRONMENT: Dark room, cool temperature (18°C) to facilitate deep sleep."
            ]
            : [
                "OBJECTIVE: Repair the gut lining and replenish glycogen stores.",
                "INTAKE: Solid, balanced meal. White Rice, Chicken, Bone Broth (Collagen).",
                "RESTRICTION: Avoid raw fiber (salads) or alcohol for 4 hours, as splanchnic blood flow is still normalizing. The gut remains permeable."
            ]
    ));

    // --- INJECT TRAVEL EVENTS ---
    if (travel && travel.isTraveling && travel.startTime && travel.durationMinutes) {
        const startOffset = Math.round((travel.startTime - referenceTime) / 60000);

        // Departure
        events.push(createEvent(startOffset, "Travel", `Depart: ${travel.mode === 'flight' ? 'Flight' : 'Drive'}`, "recovery", [
            `TRAVEL MODE: ${travel.mode.toUpperCase()}`,
            "STATUS UPDATE: Travel stress initiated. Circadian rhythm monitoring active."
        ]));

        // Arrival
        events.push(createEvent(startOffset + travel.durationMinutes, "Travel", "Arrival", "recovery", [
            "STATUS UPDATE: Travel complete. Environmental acclimation phase begins.",
            "RECOVERY ACTION: 10-min walk to reset hips/spine and stimulate lymphatic drainage."
        ]));

        // Inject Hourly/Bi-hourly Logic
        const hours = Math.floor(travel.durationMinutes / 60);
        for (let i = 1; i <= hours; i++) {
            const timeOffset = startOffset + (i * 60);

            // Hydration (Every hour for flights)
            if (travel.mode === 'flight') {
                events.push(createEvent(timeOffset, "Travel Fuel", "Cabin Hydration", "hydration", [
                    "CABIN ENVIRONMENT: Cabin air is ~15% humidity (Desert dry), accelerating dehydration.",
                    "HYDRATION PROTOCOL: 250-500ml Water + Electrolytes to maintain blood plasma volume."
                ]));
            }

            // Movement (Every 2 hours)
            if (i % 2 === 0) {
                events.push(createEvent(timeOffset + 5, "Mobility", "Travel Movement", "training", [
                    "CIRCULATION RISK: Blood pooling in lower limbs increases thrombotic risk and perceived fatigue.",
                    "MOVEMENT ACTION: Calf pumps, glute squeezes, or walk the aisle to activate muscle pumps."
                ]));
            }
        }
    }

    // --- INJECT AD-HOC USER EVENTS ---
    if (user.adhocEvents && user.adhocEvents.length > 0) {
        user.adhocEvents.forEach(evt => {
            // Calculate offset in minutes relative to referenceTime (Now)
            const minutesAgo = Math.round((evt.timestamp - referenceTime) / 60000);

            // Format label/title based on type
            let title = "User Log";
            let type: TimelineEvent['type'] = 'recovery';
            let label = "Log";

            if (evt.type === 'bowel') {
                title = "Bowel Movement";
                type = 'recovery'; // or a new 'health' type? Re-using recovery for now.
                label = "Health";
            }
            if (evt.type === 'meal') { title = "Meal Logged"; type = 'nutrition'; label = "Intake"; }
            if (evt.type === 'sleep') { title = "Sleep"; type = 'recovery'; label = "Rest"; }
            if (evt.type === 'symptom') { title = "Symptom Logged"; type = 'recovery'; label = "Health"; }

            events.push(createEvent(minutesAgo, label, title, type, [
                evt.detail || "Event logged by user.",
                "IMPACT: Timeline recalibrated."
            ]));
        });
    }

    // Sort events by time
    // Filter out items that are strictly in the past (e.g. earlier today)
    // Keep items from "Now" onwards (allow a small buffer of 5 mins for "Active")
    // CHECK: Widened to 24 hours to ensure "Today's" earlier events (like breakfast) are shown on Day 1
    const cutoff = referenceTime - 24 * 60 * 60 * 1000;

    const sortedEvents = events
        .filter(e => (e._timestamp || 0) > cutoff)
        .sort((a, b) => (a._timestamp || 0) - (b._timestamp || 0));

    // Also dedup headlines if needed?
    // No, standard flow.

    return { headline: chatMessage, theme, timeline: sortedEvents, memoryContext: memoryMessage };
};

export const generateAnalysis = (log: any): any => {
    // In a real app, this would use an LLM. Here we simulate "Authoritative AI" logic.
    // Fetch user profile for context
    const profile = getProfile();
    const isIBSD = profile?.diagnoses?.some(d => d.includes('IBS-D')) || false;
    const isIBSC = profile?.diagnoses?.some(d => d.includes('IBS-C')) || false;

    // 1. Calculate Readiness Score (Mock based on gut scale + sleep/stress heuristics)
    const baseScore = 7.5;
    const gutMod = (log.gutScale || 8) * 0.2; // roughly +1.6 for an 8
    const ratingMod = (log.feedback?.rating || 3) * 0.1;
    const readiness = Math.min(10, +(baseScore + gutMod - 2 + ratingMod - (isIBSD && log.gutScale < 5 ? 1 : 0)).toFixed(1));

    // 2. Determine Outcome Text
    let outcome = "Stable baseline execution.";
    if (readiness > 8.5) outcome = "High energy, stable focus, mild transient GI deviation";
    else if (readiness > 6) outcome = "Moderate performance, noted fatigue in final quartile.";
    else outcome = "Sub-optimal readiness, likely driven by residual inflammation.";

    // 3. Adherence (Mock)
    const adherence = 85 + Math.floor(Math.random() * 14); // 85-99%

    // 4. Generate Deviations based on Notes or Heuristics
    // We scan notes for keywords to make it feel "real"
    const notesLower = (log.feedback?.notes || "").toLowerCase();
    const deviations = [];

    if (notesLower.includes('potato') || notesLower.includes('rice') || notesLower.includes('bread')) {
        deviations.push({
            title: "Meal swap detection",
            details: [
                "Dinner T-24h: Detected carbohydrate source variance.",
                "Outcome: Neutral performance impact.",
                "GI response: Slightly increased stool bulk next morning."
            ]
        });
    } else {
        deviations.push({
            title: "Macronutrient Timing",
            details: [
                "Pre-event meal timing was optimal.",
                "Hydration bolus T-60min was slightly aggressive.",
                "Result: Mild urge frequency increase."
            ]
        });
    }

    if (log.gutScale < 6) {
        deviations.push({
            title: "Gut Signal",
            details: [
                "Timing: Mid-event.",
                "Sensation: Bloating > 4/10.",
                "Resolution: Required pace reduction."
            ]
        });
    } else {
        deviations.push({
            title: "Bowel movement signal",
            details: [
                "Timing: Pre-event morning.",
                "Bristol scale: Type 4 (Optimal).",
                "Urgency: None.",
                "Discomfort: Low."
            ]
        });
    }

    // 5. Interpretation
    const interpretation = {
        primary: log.gutScale > 7 ? "Gut deviation was load-related, not stress-induced" : "Inflammatory signal detected.",
        signals: [
            "No cramping detected during high intensity.",
            "No bloating reported in T-60 window.",
            "Heart rate variability (inferred) remained stable."
        ],
        contributors: [
            "Slightly higher resistant starch from dietary choices.",
            "Combined with pre-event electrolyte intake increasing gut motility."
        ],
        negatives: [
            "Not intolerance driven.",
            "Not cortisol-driven GI distress.",
            "Not caffeine mis-timing."
        ]
    };

    // 6. Recommendations
    const recommendations = [
        {
            category: "Nutrition Adjustments",
            items: [
                "Prefer white rice over potatoes in final 24h pre-event window.",
                "Keep total evening carb load ≤250 g cooked.",
                "Maintain current protein and fat levels."
            ]
        },
        {
            category: "Hydration Adjustments",
            items: [
                "Reduce pre-wake sodium load from ~1000 mg → ~700 mg.",
                "Delay first electrolyte bolus until after initial bowel movement."
            ]
        },
        {
            category: "Timing Tweaks",
            items: [
                "Advance dinner T-24h by additional 30–45 minutes.",
                "Add 5–10 minute walk post-dinner consistently."
            ]
        }
    ];

    // --- ADAPTIVE GUARDRAILS ---
    if (isIBSD) {
        recommendations.push({
            category: "IBS-D Guardrail",
            items: [
                "Risk Flag: Motility is naturally high. Reduce caffeine intake T-4h significantly.",
                "Adjustment: Increase sodium in post-run rehydration by 20% to account for potentially looser stool output."
            ]
        });
        interpretation.contributors.push("Baseline motility (IBS-D) likely amplified by pre-race nerves.");
    }

    if (isIBSC) {
        recommendations.push({
            category: "IBS-C Guardrail",
            items: [
                "Risk Flag: Incomplete evacuation detected. Add 300mg Magnesium Citrate to T-12h protocol.",
                "Adjustment: Ensure T-24h fiber intake comes from soluble sources (Kiwi, Oats) rather than insoluble."
            ]
        });
    }

    // 7. Coach Note
    const notesPool = [
        "Protocol is fundamentally sound. Minor GI signal likely from carbohydrate source. Maintain structure.",
        "Excellent execution. The increase in sodium paid off. Let's repeat this exact setup next time.",
        "Good resilience. The gut distress was managed well. Next time, let's simplify the T-4h meal to just liquid."
    ];
    const coachNote = notesPool[Math.floor(readiness) % 3] || notesPool[0];

    return {
        readiness,
        outcome,
        adherence,
        riskLevel: readiness > 8 ? "Low, with minor adjustments" : "Moderate, requires protocol review",
        deviations,
        interpretation,
        recommendations,
        confidence: {
            stability: "High",
            fuelingRisk: "Low",
            changeNeed: "No"
        },
        coachNote
    };
};
