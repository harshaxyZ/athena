"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, ArrowRight } from "lucide-react";
import { uploadDocument, askDirectQuestion } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentClass = Number(searchParams.get("class")) || 5;
  const language = searchParams.get("lang") || "hi-IN";
  const directQuestion = searchParams.get("q") || "";

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // If there's a direct question, auto-submit
  useEffect(() => {
    if (directQuestion) {
      handleDirectQuestion();
    }
  }, []);

  const handleDirectQuestion = async () => {
    setUploading(true);
    setError("");
    try {
      const result = await askDirectQuestion(directQuestion, studentClass, language);
      router.push(`/session/${result.session_id}?class=${studentClass}&lang=${language}`);
    } catch (e: any) {
      setError(e.message || "Failed to process question");
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadDocument(file, studentClass, language);
      router.push(`/session/${result.session_id}?class=${studentClass}&lang=${language}`);
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-6"
          >
            <Loader2 className="w-16 h-16 text-vidya-500" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
            {directQuestion ? "Thinking about your question..." : "Analyzing your document..."}
          </h2>
          <p className="text-slate-500 mb-6">
            Our AI teacher is preparing a visual lesson for you
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {["📄 Reading content", "🧠 Understanding concepts", "🎨 Creating visuals"].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 1.5, repeat: Infinity, duration: 3 }}
                className="text-xs text-slate-400"
              >
                {step}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-slate-800 mb-2">
            Upload Study Material
          </h1>
          <p className="text-slate-500">
            Class {studentClass} • Upload a PDF, text file, or any document
          </p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`upload-zone rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragOver ? "drag-over" : ""
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-vidya-500" />
              <div>
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-sm text-slate-400 hover:text-red-500 transition-colors"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-vidya-300" />
              <div>
                <p className="font-medium text-slate-700">
                  Tap to select a file, or <span className="text-vidya-500">browse</span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  PDF, TXT, MD up to 20MB
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm text-center mt-4"
          >
            {error}
          </motion.p>
        )}

        {/* Upload Button */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-8"
          >
            <button
              onClick={handleUpload}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-vidya-500 to-vidya-600 hover:from-vidya-600 hover:to-vidya-700 text-white font-display font-bold text-lg rounded-2xl shadow-lg shadow-vidya-500/25 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              Generate Visual Lesson
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
