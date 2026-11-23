/*
 * Interludio de video a pantalla completa entre secciones.
 * Se mantiene oculto hasta que el archivo carga: si el video aún no se generó,
 * la sección no ocupa espacio.
 */
import { useEffect, useRef, useState } from 'react';
import { INTERLUDES } from '../assets.config.js';
import { prefersReducedMotion } from '../lib/depth.js';

export function VideoInterlude({ id }) {
  const cfg = INTERLUDES[id];
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reproduce solo cuando está en pantalla (ahorra batería y CPU)
  useEffect(() => {
    const v = ref.current;
    if (!v || !ready || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !prefersReducedMotion()) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, [ready]);

  if (!cfg || failed) return null;

  return (
    <section className={'interlude' + (ready ? ' is-ready' : '')} aria-label={cfg.caption}>
      <video
        ref={ref}
        className="interlude__video"
        src={cfg.src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div className="interlude__caption">
        <span className="interlude__depth">{cfg.depth}</span>
        <span className="interlude__title">{cfg.caption}</span>
        <span className="interlude__note">{cfg.note}</span>
      </div>
    </section>
  );
}
