import { useEffect, useRef } from 'react';
import { haversine } from '../utils/geoMath';

// Distance in metres to trigger announcement
const TRIGGER_DISTANCE = 80;

export function useStopAnnouncer({ currentPosition, stops, enabled = true }) {
  const announcedRef  = useRef(new Set()); // stop orders already announced
  const speechRef     = useRef(null);

  // Reset announced stops when route changes
  useEffect(() => {
    announcedRef.current = new Set();
  }, [stops]);

  useEffect(() => {
    if (!enabled || !currentPosition || !stops?.length) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const sorted = [...stops].sort((a, b) => a.order - b.order);

    sorted.forEach((stop) => {
      if (announcedRef.current.has(stop.order)) return;

      const dist = haversine(
        currentPosition.lat, currentPosition.lng,
        stop.lat, stop.lng
      );

      if (dist <= TRIGGER_DISTANCE) {
        announcedRef.current.add(stop.order);
        announce(stop.name);
      }
    });
  }, [currentPosition, stops, enabled]);

  function announce(stopName) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const text = `Arriving at ${stopName}`;
    const utt  = new SpeechSynthesisUtterance(text);

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      v.lang.startsWith('en') && v.name.includes('Female')
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    if (preferred) utt.voice = preferred;
    utt.rate   = 0.95;
    utt.pitch  = 1;
    utt.volume = 1;

    speechRef.current = utt;
    window.speechSynthesis.speak(utt);
    console.log(`[Announcer] "${text}"`);
  }

  // Manual trigger (for testing)
  function testAnnounce(stopName) {
    announce(stopName || 'Test Stop');
  }

  return { testAnnounce };
}