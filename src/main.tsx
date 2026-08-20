import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import 'katex/dist/katex.min.css';
import './index.css';

const App = lazy(() => Capacitor.isNativePlatform()
  ? import('./native/NativeApp.tsx')
  : import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-dvh bg-slate-950" />}>
      <App />
    </Suspense>
  </StrictMode>,
);
