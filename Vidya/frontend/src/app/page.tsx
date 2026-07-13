"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getConversations } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import InputBar from "@/components/layout/InputBar";
import MessageList from "@/components/chat/MessageList";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

export default function HomePage() {
  const { sidebarOpen, setSidebarOpen, setConversations, currentCost } = useStore();

  useEffect(() => {
    getConversations().then(setConversations).catch(() => {});
    // Default sidebar open on desktop only
    if (window.innerWidth >= 1024) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [setConversations, setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#000' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative z-40 h-full transition-all duration-200 ${
          sidebarOpen
            ? "translate-x-0 w-72"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <img src="/athena-logo.png" alt="Athena" className="w-6 h-6 object-contain" />
            <span className="font-medium text-sm text-stone-200">Athena</span>
            <span className="text-xs text-stone-500">v1.4</span>
          </div>

          <div className="flex-1" />

          {currentCost && currentCost.total_tokens > 0 && (
            <div className="cost-badge">
              <span>${currentCost.total_cost_usd.toFixed(4)}</span>
              <span className="opacity-40">/</span>
              <span>₹{currentCost.total_cost_inr.toFixed(2)}</span>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>

        {/* Input */}
        <InputBar />
      </div>
    </div>
  );
}
