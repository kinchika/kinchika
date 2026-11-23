import { useEffect } from 'react';
import { prefersReducedMotion } from './depth.js';

const SELECTOR = [
  '.section__head', '.mission-card', '.badge', '.history-text', '.instructor-card',
  '.timeline-node', '.schedule-card', '.table-card', '.event-card', '.results-table',
  '.directiva-card', '.location-card', '.contact-card', '.interlude__caption',
].join(',');

/**
 * Revela los elementos al entrar en pantalla. Solo marca los elementos presentes
 * al montar: los que aparecen después (p. ej. al filtrar eventos) se ven directo.
 */
export function useReveal() {
  useEffect(() => {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const els = Array.from(document.querySelectorAll(SELECTOR));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => {
      // pequeño desfase para elementos hermanos (efecto cascada)
      const idx = Array.prototype.indexOf.call(el.parentElement?.children || [], el);
      el.style.setProperty('--reveal-delay', `${Math.min(idx, 6) * 70}ms`);
      el.classList.add('reveal');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}
