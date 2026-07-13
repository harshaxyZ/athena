"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getConversations, deleteConversation } from "@/lib/api";
import { Plus, MessageSquare, Trash2, Settings, Globe } from "lucide-react";
import { LANGUAGES } from "@/lib/types";

export default function Sidebar() {
  const {
    conversations, setConversations, currentConversationId,
    setCurrentConversation, newChat, setSidebarOpen,
    language, secondaryLanguage, setLanguage, setSecondaryLanguage,
  } = useStore();

  useEffect(() => {
    getConversations().then(setConversations).catch(() => {});
  }, [setConversations]);

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
    // Load conversation messages
    import("@/lib/api").then(({ getConversation }) => {
      getConversation(id).then((conv) => {
        if (conv?.messages) {
          const msgs = conv.messages.map((m: any, i: number) => ({
            id: `msg-${i}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            hasAnimation: m.has_animation,
            animationData: m.animation_data,
          }));
          useStore.setState({ messages: msgs });
        }
      });
    });
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    newChat();
    setSidebarOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(id);
    const updated = conversations.filter((c) => c.conversation_id !== id);
    setConversations(updated);
    if (currentConversationId === id) newChat();
  };

  return (
    <div className="w-72 h-full border-r flex flex-col" style={{background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.06)'}}>
      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-athena-600 text-white font-medium text-sm hover:bg-athena-500 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {conversations.length === 0 && (
          <div className="text-center text-stone-500 text-sm py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No conversations yet
          </div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.conversation_id}
            onClick={() => handleSelectConversation(conv.conversation_id)}
            className={`sidebar-item group flex items-center justify-between ${
              currentConversationId === conv.conversation_id ? "active" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm">{conv.title || "New Chat"}</div>
              <div className="text-xs text-stone-600 mt-0.5">
                {conv.message_count} messages
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(conv.conversation_id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Settings panel */}
      <div className="p-3 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Settings className="w-3.5 h-3.5" />
          <span>Language Settings</span>
        </div>

        {/* Primary language */}
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Primary Language</label>
          <div className="flex items-center gap-2 bg-surface-700 rounded-lg px-3 py-2">
            <Globe className="w-3.5 h-3.5 text-athena-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs text-stone-200 outline-none flex-1 cursor-pointer"
            >
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary language */}
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Secondary Language</label>
          <div className="flex items-center gap-2 bg-surface-700 rounded-lg px-3 py-2">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={secondaryLanguage}
              onChange={(e) => setSecondaryLanguage(e.target.value)}
              className="bg-transparent text-xs text-stone-200 outline-none flex-1 cursor-pointer"
            >
              <option value="">None</option>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
