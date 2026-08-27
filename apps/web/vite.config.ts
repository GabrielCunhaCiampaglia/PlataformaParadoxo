import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, type Plugin } from 'vite';

/**
 * Endpoint SÓ DE DESENVOLVIMENTO para gravar em disco uma captura do canvas.
 *
 * Existe porque a verificação visual da rolagem 3D precisa de um arquivo de
 * imagem para inspecionar, e o canvas WebGL só existe dentro do navegador.
 * Nunca entra no build de produção — é um plugin com `apply: 'serve'`.
 */
function snapshotEndpoint(): Plugin {
  return {
    name: 'paradoxo-snapshot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__snapshot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('POST apenas');
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(Buffer.concat(chunks).toString());
            const safe = String(name ?? 'snap').replace(/[^a-z0-9_-]/gi, '');
            const base64 = String(dataUrl).split(',')[1] ?? '';
            const out = resolve(server.config.root, '.snapshots', `${safe}.png`);
            mkdirSync(dirname(out), { recursive: true });
            writeFileSync(out, Buffer.from(base64, 'base64'));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: out }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), snapshotEndpoint()],

  // Alias direto para o CÓDIGO-FONTE dos pacotes do workspace.
  //
  // Sem isto o Vite resolvia pelo link do node_modules e servia uma versão
  // em cache: alterações no dice-3d chegavam de forma intermitente, o que
  // produziu horas de diagnóstico atrás de bugs que já estavam corrigidos.
  // Com o alias, os pacotes entram como fonte local e o HMR é confiável.
  resolve: {
    alias: {
      '@paradoxo/dice-3d': resolve(import.meta.dirname, '../../packages/dice-3d/src/index.ts'),
      '@paradoxo/table-3d': resolve(import.meta.dirname, '../../packages/table-3d/src/index.ts'),
      '@paradoxo/rules': resolve(import.meta.dirname, '../../packages/rules/src/index.ts'),
    },
  },
  optimizeDeps: { exclude: ['@paradoxo/dice-3d', '@paradoxo/rules', '@paradoxo/table-3d'] },
  build: { target: 'es2022', sourcemap: false },
  server: {
    // Respeita a porta atribuída pelo harness de preview quando existir.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
