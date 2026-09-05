import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Mesa from './Mesa';
import PocDados from './PocDados';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

/*
 * Roteamento mínimo: a PoC é uma tela de diagnóstico, não merece um router.
 *
 * O caminho é lido RELATIVO ao base. Na Cloudflare o base é "/" e "/mesa" cai
 * em "mesa"; no GitHub Pages o base é "/PlataformaParadoxo/" e
 * "/PlataformaParadoxo/mesa" também cai em "mesa". Sem descontar o base, a
 * rota do Pages nunca casava e tudo caía na tela inicial.
 */
const base = import.meta.env.BASE_URL;
const rota = window.location.pathname.startsWith(base)
  ? window.location.pathname.slice(base.length)
  : window.location.pathname.replace(/^\//, '');

const Page = rota.startsWith('poc-dados') ? PocDados : rota.startsWith('mesa') ? Mesa : App;

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
