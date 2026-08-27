import { percentileDice } from '@paradoxo/dice-3d';
import { TableScene, type Hotspot, type ViewName } from '@paradoxo/table-3d';
import { useEffect, useRef, useState } from 'react';

/**
 * A mesa — cena inicial.
 *
 * O 3D é a casca, não a interface. A ficha continua sendo HTML: quando a câmera
 * chega ao papel, o texto entra POR CIMA e a cena para de desenhar. Ler a ficha
 * custa zero GPU, e o teclado, a rolagem e a seleção de texto do celular
 * funcionam porque nunca deixaram de ser DOM.
 */

const DADOS = ['d100', 'd20', 'd10', 'd8', 'd6', 'd4'] as const;
type DadoId = (typeof DADOS)[number];

export default function Mesa() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TableScene | null>(null);
  const [view, setView] = useState<ViewName>('mesa');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dado, setDado] = useState<DadoId>('d100');
  const [qtd, setQtd] = useState(1);
  const [resultado, setResultado] = useState<number[] | null>(null);
  const [rolando, setRolando] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new TableScene(canvas, {
      onArrive: (v) => {
        setView(v);
        // A ficha em HTML só entra DEPOIS de a câmera chegar. Entrar durante o
        // movimento faria o papel e o texto brigarem pelo mesmo espaço da tela.
        if (v === 'ficha') {
          setSheetOpen(true);
          scene.setPaused(true);
        }
      },
      onPick: (spot: Hotspot) => {
        if (spot === 'dados') setView('dados');
      },
    });
    sceneRef.current = scene;

    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(canvas);

    // Handle de diagnóstico, para as verificações visuais.
    (window as unknown as { __mesa?: unknown }).__mesa = {
      goTo: (v: ViewName) => scene.jumpTo(v),
      snapshot: () => scene.snapshot(),
      renderOnce: () => scene.renderOnce(),
      internalSize: () => scene.internalSize,
      view: () => scene.currentView,
      layout: () => scene.currentLayout,
      roll: (dice: Parameters<TableScene['roll']>[0], seed?: number) => scene.roll(dice, seed),
      skipRoll: () => scene.skipRoll(),
    };

    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const voltar = () => {
    setSheetOpen(false);
    setResultado(null);
    sceneRef.current?.setPaused(false);
    sceneRef.current?.goTo('mesa');
  };

  const rolar = async () => {
    const scene = sceneRef.current;
    if (!scene || rolando) return;
    setRolando(true);
    setResultado(null);
    try {
      const valores: number[] = [];
      const spec: Parameters<TableScene['roll']>[0] = [];
      for (let i = 0; i < qtd; i++) {
        if (dado === 'd100') {
          const v = 1 + Math.floor(Math.random() * 100);
          valores.push(v);
          spec.push(...percentileDice(v));
        } else {
          const faces = Number(dado.slice(1));
          const v = 1 + Math.floor(Math.random() * faces);
          valores.push(v);
          spec.push({ id: dado, value: v });
        }
      }
      await scene.roll(spec);
      setResultado(valores);
    } finally {
      setRolando(false);
    }
  };

  // O d100 usa DOIS dados por rolagem; mais de três pares polui o tapete.
  const maxQtd = dado === 'd100' ? 3 : 10;

  return (
    <div className="mesa">
      <canvas ref={canvasRef} className="mesa-canvas" />

      {view === 'mesa' && !sheetOpen && (
        <p className="mesa-dica">Toque na ficha ou no tapete de dados</p>
      )}

      {sheetOpen && (
        <div className="mesa-ficha">
          <div className="mesa-ficha-papel">
            <h1>Ficha de Membro</h1>
            <p className="mesa-ficha-nota">
              Aqui entra a ficha em HTML — o 3D atrás está congelado e não custa
              GPU nenhuma enquanto esta tela está aberta.
            </p>
            <button type="button" className="mesa-fechar" onClick={voltar}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {view === 'dados' && !sheetOpen && (
        <div className="mesa-dados">
          {resultado && (
            <p className="mesa-total">
              {resultado.reduce((a, b) => a + b, 0)}
              {resultado.length > 1 && (
                <span className="mesa-parcelas">{resultado.join(' + ')}</span>
              )}
            </p>
          )}
          <div className="mesa-controles">
            <select
              className="mesa-select"
              value={dado}
              onChange={(e) => {
                const d = e.target.value as DadoId;
                setDado(d);
                setQtd((q) => Math.min(q, d === 'd100' ? 3 : 10));
              }}
            >
              {DADOS.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              className="mesa-select"
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
            >
              {Array.from({ length: maxQtd }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
            <button type="button" className="mesa-rolar" onClick={rolar} disabled={rolando}>
              {rolando ? 'Rolando…' : 'Rolar'}
            </button>
          </div>
        </div>
      )}

      {/* O botão vem DEPOIS do overlay no DOM de propósito: antes, a camada da
          ficha pintava por cima dele e engolia o toque — não dava para sair. */}
      {view !== 'mesa' && !sheetOpen && (
        <button type="button" className="mesa-voltar" onClick={voltar}>
          ← Mesa
        </button>
      )}
    </div>
  );
}
