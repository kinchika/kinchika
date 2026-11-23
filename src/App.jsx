import { lazy, Suspense, useEffect, useState } from 'react';
import { AudioOverlay, HUD, ProgressBar, SoundBtn, TopNav } from './components/Chrome.jsx';
import { VideoInterlude } from './components/VideoInterlude.jsx';
import { EditorialDivider, Hero, History, Mission } from './sections/Intro.jsx';
import { Timeline } from './sections/Timeline.jsx';
import { Schedule } from './sections/Schedule.jsx';
import { Events } from './sections/Events.jsx';
import { Contact, Directiva, Footer, Location, Results } from './sections/Club.jsx';
import { startDepthTracking } from './lib/depth.js';
import { useIsMobile } from './lib/useIsMobile.js';
import { useReveal } from './lib/useReveal.js';

// La escena 3D (three.js) se carga aparte para no retrasar el primer render del texto
const OceanScene = lazy(() => import('./scene/OceanScene.jsx'));

export default function App() {
  const [overlayDone, setOverlayDone] = useState(false);
  const mobile = useIsMobile();
  useEffect(() => { startDepthTracking(); }, []);
  useReveal();

  return (
    <>
      <div id="deep-bg" aria-hidden="true"/>
      <Suspense fallback={null}>
        <OceanScene mobile={mobile}/>
      </Suspense>
      <div id="vignette" aria-hidden="true"/>
      <ProgressBar/>

      {!overlayDone && <AudioOverlay onContinue={() => setOverlayDone(true)}/>}
      <TopNav/>
      <HUD/>
      <SoundBtn/>

      <main>
        <Hero/>
        <EditorialDivider/>
        <Mission/>
        <VideoInterlude id="cardumen"/>
        <History/>
        <Timeline/>
        <VideoInterlude id="descenso"/>
        <Schedule/>
        <Events/>
        <Results/>
        <Directiva/>
        <VideoInterlude id="abismo"/>
        <Location/>
        <Contact/>
      </main>
      <Footer/>
    </>
  );
}
