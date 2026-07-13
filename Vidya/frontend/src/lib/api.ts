// Athena API client

const API_BASE = "/api";

// ── Chat (streaming) ─────────────────────────────────────────────

export interface ChatStreamHandle {
  close: () => void;
}

export function chatStream(
  message: string,
  conversationId: string,
  language: string,
  secondaryLanguage: string,
  file: File | null,
  onText: (token: string) => void,
  onAnimation: (data: any) => void,
  onAudio: (base64: string) => void,
  onCost: (data: any) => void,
  onDone: (conversationId: string) => void,
  onError: (error: string) => void,
  onStatus?: (status: string) => void,
): ChatStreamHandle {
  const controller = new AbortController();

  const formData = new FormData();
  formData.append("message", message);
  formData.append("conversation_id", conversationId);
  formData.append("language", language);
  formData.append("secondary_language", secondaryLanguage);
  if (file) {
    formData.append("file", file);
  }

  fetch(`${API_BASE}/chat`, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (data.type) {
                case "text":
                  onText(data.content);
                  break;
                case "animation":
                  onAnimation(data.data);
                  break;
                case "audio":
                  onAudio(data.data);
                  break;
                case "cost":
                  onCost(data.data);
                  break;
                case "done":
                  onDone(data.conversation_id);
                  break;
                case "error":
                  onError(data.content);
                  break;
                case "status":
                  onStatus?.(data.content);
                  break;
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message);
      }
    });

  return { close: () => controller.abort() };
}

// ── History ──────────────────────────────────────────────────────

export async function getConversations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.conversations || [];
}

export async function getConversation(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function deleteConversation(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/chat/conversations/${id}`, { method: "DELETE" });
  return res.ok;
}

// ── Cost ─────────────────────────────────────────────────────────

export async function getConversationCost(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/cost/${id}`);
  if (!res.ok) return null;
  return res.json();
}

// ── Visual (on-demand) ──────────────────────────────────────────

export async function generateVisual(topic: string, description: string, conversationId: string): Promise<any> {
  const formData = new FormData();
  formData.append("topic", topic);
  formData.append("description", description);
  formData.append("conversation_id", conversationId);

  const res = await fetch(`${API_BASE}/chat/visual`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Visual generation failed");
  return res.json();
}
