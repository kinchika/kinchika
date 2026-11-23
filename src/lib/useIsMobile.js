import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 900) {
  const [mob, setMob] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const h = () => setMob(window.innerWidth <= breakpoint);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [breakpoint]);
  return mob;
}
