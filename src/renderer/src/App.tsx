import MapEditor from './map/MapEditor';
import { useState } from 'react';
import PreparationWorkspace from './ai/PreparationWorkspace';

export default function App() {
  const [preparation, setPreparation] = useState(false);
  return preparation
    ? <PreparationWorkspace onBack={() => setPreparation(false)} />
    : <><MapEditor /><button className="preparation-entry" onClick={() => setPreparation(true)}>Preparation · AI optional · DM only</button></>;
}
