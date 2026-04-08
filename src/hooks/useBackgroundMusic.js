import { useEffect, useRef, useState } from "react";

/**
 * Hook to play background music on the display page.
 * @param {boolean} isPlaying - Whether music should be playing
 * @returns {{ audioUnlocked: boolean, unlockAudio: () => void }}
 */
export function useBackgroundMusic(isPlaying) {
  const audioRef = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Create the audio element once
  useEffect(() => {
    const audio = new Audio("/music_background_countdown.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Play/pause based on isPlaying and audioUnlocked
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && audioUnlocked) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUnlocked]);

  function unlockAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    // Play and immediately pause to unlock autoplay
    audio.play().then(() => {
      if (!isPlaying) audio.pause();
      setAudioUnlocked(true);
    }).catch(() => {
      // fallback: still mark as unlocked, next play attempt may work
      setAudioUnlocked(true);
    });
  }

  return { audioUnlocked, unlockAudio };
}

