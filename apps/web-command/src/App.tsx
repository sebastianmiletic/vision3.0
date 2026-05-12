import { useEffect } from 'react';

import { VisionLegacyShell } from './features/legacy-shell/VisionLegacyShell';

function App() {
  useEffect(() => {
    document.body.className = 'preset-normal layout-operator';
    return () => {
      document.body.className = '';
    };
  }, []);

  return <VisionLegacyShell />;
}

export default App;
