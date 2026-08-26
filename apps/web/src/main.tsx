import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PocDados from './PocDados';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

// Roteamento mínimo: a PoC é uma tela de diagnóstico, não merece um router.
const Page = window.location.pathname.startsWith('/poc-dados') ? PocDados : App;

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
