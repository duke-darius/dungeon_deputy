import React from 'react';
import { createRoot } from 'react-dom/client';
import JoinPage from './JoinPage';
import './player.css';

const invite = new URLSearchParams(location.search).get('invite') ?? '';
if (invite) history.replaceState(null, '', '/join');
createRoot(document.getElementById('root')!).render(<React.StrictMode><JoinPage initialInvite={invite} /></React.StrictMode>);
