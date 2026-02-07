import { createClient } from '@supabase/supabase-js';

// Define the Database Schema Types
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    username: string | null
                    weight: number | null
                    height: number | null
                    gender: string | null
                    diagnoses: string[] | null
                    medications: string[] | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    username?: string | null
                    weight?: number | null
                    height?: number | null
                    gender?: string | null
                    diagnoses?: string[] | null
                    medications?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    username?: string | null
                    weight?: number | null
                    height?: number | null
                    gender?: string | null
                    diagnoses?: string[] | null
                    medications?: string[] | null
                    created_at?: string
                }
            }
            logs: {
                Row: {
                    id: string
                    user_id: string
                    timestamp: number
                    session_time: string | null
                    intensity: string | null
                    duration: string | null
                    gut_scale: number | null
                    symptoms: string[] | null
                    plan: Json | null
                    status: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    timestamp: number
                    session_time?: string | null
                    intensity?: string | null
                    duration?: string | null
                    gut_scale?: number | null
                    symptoms?: string[] | null
                    plan?: Json | null
                    status?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    timestamp?: number
                    session_time?: string | null
                    intensity?: string | null
                    duration?: string | null
                    gut_scale?: number | null
                    symptoms?: string[] | null
                    plan?: Json | null
                    status?: string | null
                    created_at?: string
                }
            }
        }
    }
}

// Create a single supabase client for interacting with your database
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables.');
}

export const supabase = createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
