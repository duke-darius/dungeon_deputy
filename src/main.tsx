import React from 'react';
import { createRoot } from 'react-dom/client';

function SetupShell() {
  return <main><h1>DungeonDeputy</h1><p>Local scene presentation foundation</p></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><SetupShell /></React.StrictMode>);
