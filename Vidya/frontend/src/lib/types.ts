// Athena types

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  hasAnimation?: boolean;
  animationData?: AnimationData;
  isStreaming?: boolean;
}

export interface AnimationData {
  type?: string;
  code?: string;
}

export interface Conversation {
  conversation_id: string;
  title: string;
  language: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}

export interface CostData {
  session_id: string;
  total_cost_usd: number;
  total_cost_inr: number;
  total_tokens: number;
  total_calls: number;
}

export const LANGUAGES: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "bn-IN": "Bengali",
  "mr-IN": "Marathi",
  "gu-IN": "Gujarati",
  "ml-IN": "Malayalam",
  "pa-IN": "Punjabi",
};
