"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Records the current tab (video + audio) via getDisplayMedia + MediaRecorder,
 * producing a downloadable .webm when stopped. Realtime, no server involvement.
 */
export function useLessonRecorder(fileBaseName = "lesson") {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getDisplayMedia &&
        typeof window !== "undefined" &&
        "MediaRecorder" in window
    );
  }, []);

  const pickMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported || recording) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
    } catch {
      return; // user cancelled the picker
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBaseName.replace(/[^\w\-]+/g, "_") || "lesson"}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecording(false);
    };

    // If the user stops sharing via the browser UI, finalize the recording.
    stream.getVideoTracks()[0]?.addEventListener("ended", stop);

    rec.start();
    setRecording(true);
  }, [supported, recording, fileBaseName, stop]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { recording, supported, start, stop };
}
