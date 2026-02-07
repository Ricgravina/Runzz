export const KNOWLEDGE_BASE = {
    "global_assumptions": {
        "disclaimer": "Educational self-management support, not medical advice",
        "default_guidance": [
            "When in doubt, choose recovery over intensity",
            "Stopping early is a protective decision, not failure"
        ]
    },
    "phases": {
        "before": [
            {
                "id": "before_remission_easy_to_moderate",
                "disease_state": "remission",
                "exercise_allowed": "yes",
                "recommended_intensity": ["easy", "moderate"],
                "expect_bowel_movement": {
                    "likelihood": "low_to_moderate",
                    "timing": "before_or_during_warmup"
                },
                "nutrition": {
                    "last_full_meal": {
                        "timing_hours": "2-3",
                        "examples": [
                            "white_rice + eggs",
                            "toast + peanut_butter (small amount)",
                            "plain oatmeal (small portion, well tolerated)"
                        ]
                    },
                    "pre_workout_snack_optional": {
                        "timing_minutes": "30-60",
                        "examples": [
                            "half banana",
                            "rice cake with honey",
                            "applesauce pouch"
                        ]
                    },
                    "avoid": [
                        "raw vegetables",
                        "high-fiber grains",
                        "fat-heavy meals",
                        "protein shakes",
                        "sugar alcohols"
                    ]
                },
                "hydration": {
                    "guidance": [
                        "Drink 12–16oz water in the 2 hours before",
                        "Sip only in the last 30 minutes",
                        "Avoid carbonation"
                    ]
                },
                "app_instruction": "Proceed as planned. Choose routes with bathroom access if anxiety exists."
            },
            {
                "id": "before_remission_hard_or_long",
                "disease_state": "remission",
                "exercise_allowed": "conditional",
                "recommended_intensity": ["moderate_only"],
                "expect_bowel_movement": {
                    "likelihood": "moderate",
                    "timing": "during_or_immediately_after"
                },
                "nutrition": {
                    "last_full_meal": {
                        "timing_hours": "3-4",
                        "examples": [
                            "white rice + chicken",
                            "plain pasta + olive oil (minimal)",
                            "toast + egg whites"
                        ]
                    },
                    "pre_workout": {
                        "guidance": "If needed, liquid calories only",
                        "examples": [
                            "sports drink diluted 50%",
                            "electrolyte drink without sugar alcohols"
                        ]
                    }
                },
                "exercise_modification": [
                    "Reduce target pace",
                    "Add planned walk breaks",
                    "Cap duration if symptoms appear"
                ],
                "app_instruction": "Hard sessions increase post-run GI risk. Modify if any early symptoms appear."
            },
            {
                "id": "before_mild_symptoms_any_exercise",
                "disease_state": "mild_symptoms",
                "exercise_allowed": "conditional",
                "expect_bowel_movement": {
                    "likelihood": "high",
                    "timing": "before_or_early_during"
                },
                "nutrition": {
                    "strategy": "minimal",
                    "allowed": [
                        "water",
                        "electrolytes",
                        "clear liquids"
                    ],
                    "avoid": [
                        "solid food",
                        "fiber",
                        "fat",
                        "caffeine"
                    ]
                },
                "exercise_guidance": [
                    "Warm up near a bathroom",
                    "Start with walking",
                    "Abort workout if urgency increases"
                ],
                "app_instruction": "This is a test session. Be ready to stop without guilt."
            },
            {
                "id": "before_active_flare",
                "disease_state": "active_flare",
                "exercise_allowed": "no",
                "expect_bowel_movement": {
                    "likelihood": "very_high",
                    "timing": "unpredictable"
                },
                "recommended_activity": [
                    "walking",
                    "stretching",
                    "gentle mobility"
                ],
                "nutrition": {
                    "focus": [
                        "hydration",
                        "simple carbs",
                        "small frequent intake"
                    ]
                },
                "app_instruction": "Running or hard training now increases flare duration. Recovery is the goal."
            }
        ],
        "during": [
            {
                "id": "during_stable_no_symptoms",
                "exercise_allowed": "yes",
                "monitor": [
                    "gut sensations",
                    "hydration",
                    "energy"
                ],
                "fueling": {
                    "short_sessions": "no fueling needed",
                    "long_sessions": {
                        "allowed": [
                            "diluted sports drink",
                            "small sips every 15–20 minutes"
                        ],
                        "avoid": [
                            "gels",
                            "fiber bars",
                            "new products"
                        ]
                    }
                },
                "app_instruction": "Stay conservative even if you feel good."
            },
            {
                "id": "during_urgency_cramping",
                "exercise_allowed": "modify_or_stop",
                "expect_bowel_movement": {
                    "likelihood": "high",
                    "timing": "imminent"
                },
                "immediate_actions": [
                    "Slow to walk",
                    "Deep belly breathing",
                    "Reduce intensity immediately"
                ],
                "decision_rule": {
                    "improves_in_minutes": "continue easy",
                    "persists": "stop session"
                },
                "app_instruction": "Stopping now reduces next-day symptoms."
            },
            {
                "id": "during_fatigue_dehydration",
                "exercise_allowed": "conditional",
                "risk": "IBD athletes dehydrate faster",
                "actions": [
                    "Pause",
                    "Hydrate",
                    "End workout if dizziness occurs"
                ],
                "app_instruction": "Dehydration can worsen gut symptoms for 24–48 hours."
            }
        ],
        "after": [
            {
                "id": "after_no_symptoms",
                "recovery_expected": "normal",
                "expect_bowel_movement": {
                    "likelihood": "low_to_moderate",
                    "timing": "within_1-3_hours"
                },
                "nutrition": {
                    "timing_minutes": "30-60",
                    "examples": [
                        "white rice + eggs",
                        "smoothie with lactose-free milk",
                        "toast + nut butter"
                    ],
                    "avoid": [
                        "large salads",
                        "fried food",
                        "alcohol"
                    ]
                },
                "app_instruction": "This session was well tolerated. Log for pattern tracking."
            },
            {
                "id": "after_gi_symptoms",
                "recovery_expected": "delayed",
                "expect_bowel_movement": {
                    "likelihood": "high",
                    "timing": "immediate_to_12_hours"
                },
                "nutrition": {
                    "immediate": [
                        "pause solid food",
                        "clear fluids",
                        "electrolytes"
                    ],
                    "reintroduce": [
                        "white rice",
                        "toast",
                        "bananas"
                    ]
                },
                "training_next_day": "reduce_or_rest",
                "app_instruction": "Treat this as a recovery signal, not a failure."
            },
            {
                "id": "after_extreme_fatigue",
                "risk_flags": [
                    "overreaching",
                    "anemia",
                    "flare_onset"
                ],
                "training_next_48_hours": "rest_or_active_recovery",
                "nutrition_focus": [
                    "carbs",
                    "protein",
                    "hydration"
                ],
                "app_instruction": "Repeated extreme fatigue should be medically reviewed."
            },
            {
                "id": "after_flare_worsening",
                "exercise_allowed": "no",
                "training_status": "recovery_only",
                "app_instruction": "Stop structured training and prioritize medical support."
            }
        ]
    }
} as const;
