import { DiceRenderer, type DieSpec, type RendererDiagnostics } from '@paradoxo/dice-3d';
import { useCallback, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';

export interface DiceCanvasHandle {
  roll: (dice: DieSpec[], opts?: { seed?: number; numberAllFaces?: boolean }) => Promise<RendererDiagnostics>;
  skip: () => void;
  /** Diagnóstico da última rolagem — usado pelas verificações de interface. */
  diagnostics: () => RendererDiagnostics | null;
  inspect: () => ReturnType<DiceRenderer['inspect']> | null;
  inspectLegibility: () => ReturnType<DiceRenderer['inspectLegibility']> | null;
  snapshot: () => string | null;
  atlasSnapshot: () => string | null;
}

interface Props {
  ref?: RefObject<DiceCanvasHandle | null>;
  onSettled?: () => void;
}

export default function DiceCanvas({ ref, onSettled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DiceRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new DiceRenderer(canvas);
    rendererRef.current = renderer;

    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);

    return () => {
      // Cleanup completo: o StrictMode roda este efeito duas vezes em dev, e
      // sem isto sobraria um contexto WebGL órfão a cada montagem.
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  const roll = useCallback(
    async (dice: DieSpec[], opts?: { seed?: number; numberAllFaces?: boolean }) => {
      const r = rendererRef.current;
      if (!r) throw new Error('Renderer ainda não montou');
      return r.roll({ dice, ...(onSettled ? { onSettled } : {}), ...opts });
    },
    [onSettled],
  );

  useImperativeHandle(
    ref,
    () => ({
      roll,
      skip: () => rendererRef.current?.skip(),
      diagnostics: () => rendererRef.current?.lastDiagnostics ?? null,
      inspect: () => rendererRef.current?.inspect() ?? null,
      inspectLegibility: () => rendererRef.current?.inspectLegibility() ?? null,
      snapshot: () => rendererRef.current?.snapshot() ?? null,
      atlasSnapshot: () => rendererRef.current?.atlasSnapshot() ?? null,
    }),
    [roll],
  );

  return (
    <canvas
      ref={canvasRef}
      className="diceCanvas"
      aria-hidden="true"
      onClick={() => rendererRef.current?.skip()}
    />
  );
}
