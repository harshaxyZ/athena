"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Clock, ArrowLeft } from "lucide-react";
import { getHistory, type LessonSummary } from "@/lib/api";
import { LANGUAGES } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory()
      .then(setLessons)
      .catch((e) => setError(e.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-vidya-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-slate-800">Past Lessons</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && (
          <p className="text-center text-slate-500 py-16">Loading your lessons...</p>
        )}
        {error && !loading && (
          <p className="text-center text-red-500 py-16">{error}</p>
        )}
        {!loading && !error && lessons.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-5xl mb-4">📚</div>
            <p>No lessons yet. Create one and it'll show up here.</p>
          </div>
        )}

        <div className="space-y-3">
          {lessons.map((lesson, i) => (
            <motion.button
              key={lesson.session_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(`/session/${lesson.session_id}?lang=${lesson.language}`)}
              className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-slate-800 truncate">
                    {lesson.topic || "Untitled lesson"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                    <span>🗣️ {LANGUAGES[lesson.language] || lesson.language}</span>
                    <span>{lesson.total_steps} scenes</span>
                    {lesson.student_class ? <span>Class {lesson.student_class}</span> : null}
                    {lesson.total_cost_usd != null && lesson.total_cost_usd > 0 && (
                      <span className="text-slate-400">${lesson.total_cost_usd.toFixed(3)}</span>
                    )}
                    {lesson.total_tokens != null && lesson.total_tokens > 0 && (
                      <span className="text-slate-400">{(lesson.total_tokens / 1000).toFixed(0)}k tok</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {lesson.created_at
                    ? new Date(lesson.created_at * 1000).toLocaleDateString()
                    : ""}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
