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
export default function Mesa() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TableScene | null>(null);
  const [view, setView] = useState<ViewName>('mesa');
  const [sheetOpen, setSheetOpen] = useState(false);

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
    };

    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const back = () => {
    setSheetOpen(false);
    sceneRef.current?.setPaused(false);
    sceneRef.current?.goTo('mesa');
  };

  return (
    <div className="mesa">
      <canvas ref={canvasRef} className="mesa-canvas" />

      {view === 'mesa' && !sheetOpen && (
        <p className="mesa-dica">Toque na ficha ou no tapete de dados</p>
      )}

      {view !== 'mesa' && (
        <button type="button" className="mesa-voltar" onClick={back}>
          ← Mesa
        </button>
      )}

      {sheetOpen && (
        <div className="mesa-ficha">
          <div className="mesa-ficha-papel">
            <h1>Ficha de Membro</h1>
            <p className="mesa-ficha-nota">
              Aqui entra a ficha em HTML — o 3D atrás está congelado e não custa
              GPU nenhuma enquanto esta tela está aberta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
