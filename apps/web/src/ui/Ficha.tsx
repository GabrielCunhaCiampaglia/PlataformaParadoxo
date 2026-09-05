import {
  CLASSES,
  RECURSOS,
  SLOTS_HABILIDADE,
  TODOS_OS_TRACOS,
  calcularCarga,
  derivarPericias,
  type CharacterSheet,
  type SkillTotal,
} from '@paradoxo/sheet';
import type { ActionResult } from '@paradoxo/rules';
import { useCallback, useMemo, useState } from 'react';
import './ficha.css';

type Aba = 'pericias' | 'tracos' | 'habilidades' | 'inventario';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'pericias', label: 'Perícias' },
  { id: 'tracos', label: 'Traços' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'inventario', label: 'Inventário' },
];

export interface FichaProps {
  ficha: CharacterSheet;
  onFechar: () => void;
  /**
   * Rola d100 contra a perícia e resolve quando os dados assentam na mesa.
   * O painel não sabe rolar: quem sabe é a cena 3D.
   */
  onRolar: (pericia: SkillTotal) => Promise<ActionResult>;
  /** Chamado quando o jogador dispensa o veredito e o painel volta à frente. */
  onEncerrarRolagem?: () => void;
}

/** Campo de identidade. Sem valor, mostra o rótulo e nada mais — não inventa. */
function Campo({ rotulo, valor }: { rotulo: string; valor: string | undefined }) {
  return (
    <div>
      <span className="fx-campo-rotulo">{rotulo}</span>
      <span className="fx-campo-valor">{valor?.trim() ? valor : '—'}</span>
    </div>
  );
}

export default function Ficha({ ficha, onFechar, onRolar, onEncerrarRolagem }: FichaProps) {
  const [aba, setAba] = useState<Aba>('pericias');
  const [rolando, setRolando] = useState(false);
  const [alvo, setAlvo] = useState<SkillTotal | null>(null);
  const [veredito, setVeredito] = useState<ActionResult | null>(null);

  const pericias = useMemo(() => derivarPericias(ficha), [ficha]);
  const carga = useMemo(() => calcularCarga(ficha), [ficha]);
  const tracos = useMemo(
    () => ficha.tracos.map((id) => TODOS_OS_TRACOS.find((t) => t.id === id)).filter((t) => t),
    [ficha.tracos],
  );
  const classe = CLASSES.find((c) => c.id === ficha.classe);

  const rolar = useCallback(
    async (pericia: SkillTotal) => {
      if (rolando) return;
      setRolando(true);
      setAlvo(pericia);
      setVeredito(null);
      try {
        setVeredito(await onRolar(pericia));
      } finally {
        setRolando(false);
      }
    },
    [onRolar, rolando],
  );

  // Enquanto rola, o painel recolhe e só o veredito fica na tela.
  const limpar = () => {
    setVeredito(null);
    setAlvo(null);
    onEncerrarRolagem?.();
  };

  /*
   * O painel fica recolhido durante a rolagem E enquanto o veredito está na
   * tela. Voltar à frente assim que os dados param tapava justamente o que o
   * jogador esperou para ver.
   */
  const recolhido = rolando || veredito !== null;

  return (
    <div className={`fx${recolhido ? ' fx--rolando' : ''}`} onClick={veredito ? limpar : undefined}>
      <div className="fx-quadro">
        <header className="fx-topo">
          <div>
            <span className="fx-selo">Ficha membro</span>
            <h1 className="fx-nome">
              {ficha.identidade.personagem?.trim() || (
                <span className="fx-sem-nome">Sem nome</span>
              )}
            </h1>
            <span className="fx-afiliacao">{ficha.identidade.afiliacao || 'Resiliência'}</span>
          </div>
          <button type="button" className="fx-fechar" onClick={onFechar} aria-label="Fechar a ficha">
            ✕
          </button>
        </header>

        <div className="fx-identidade">
          <Campo rotulo="Jogador" valor={ficha.identidade.jogador} />
          <Campo rotulo="Patente" valor={ficha.identidade.patente} />
          <Campo rotulo="Classe" valor={classe?.label} />
          <Campo rotulo="Idade" valor={ficha.identidade.idade} />
          <Campo rotulo="Nacionalidade" valor={ficha.identidade.nacionalidade} />
          <Campo rotulo="Salário" valor={ficha.identidade.salario} />
        </div>

        <div className="fx-recursos">
          {RECURSOS.map((r) => {
            const valor = ficha.recursos[r.id] ?? 0;
            // Só o Contato com o Oculto tem teto impresso; os outros não têm
            // máximo no PDF (S12), então a barra usa 100 como referência visual
            // e nada mais — não é regra, é escala.
            const perigo = r.id === 'contato-oculto' && valor >= 80;
            return (
              <div
                key={r.id}
                className={`fx-recurso${perigo ? ' fx-recurso--perigo' : ''}`}
                title={r.nota}
              >
                <div className="fx-recurso-nome">{r.curto}</div>
                <div className="fx-recurso-valor">{valor}</div>
                <div className="fx-recurso-barra">
                  <div
                    className="fx-recurso-preenchida"
                    style={{ width: `${Math.min(100, valor)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="fx-abas" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              className="fx-aba"
              onClick={() => setAba(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="fx-corpo">
          {aba === 'pericias' && (
            <>
              {pericias.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`fx-pericia${p.id === 'lutar-pela-vida' ? ' fx-pericia--destaque' : ''}`}
                  onClick={() => rolar(p)}
                  disabled={rolando}
                >
                  <span>
                    <span className="fx-pericia-nome">{p.label}</span>
                    {p.fixadoPor && <span className="fx-pericia-marca">{p.fixadoPor}</span>}
                    <br />
                    <span className="fx-pericia-conta">
                      {p.base} base
                      {p.pontos > 0 && ` + ${p.pontos} pontos`}
                      {p.bonus > 0 && ` + ${p.bonus} traço`}
                      {p.limitado && ', cortado no teto 85'}
                    </span>
                  </span>
                  <span className="fx-pericia-total">{p.total}</span>
                </button>
              ))}
              <p className="fx-nota">
                Toque numa perícia para rolar o d100 contra ela na mesa. O sucesso é rolar
                igual ou menos que o total.
              </p>
            </>
          )}

          {aba === 'tracos' && (
            <>
              <div className="fx-lotes">
                {Array.from({ length: 4 }, (_, i) => {
                  const t = tracos[i];
                  return (
                    <div key={i} className={`fx-lote${t ? '' : ' fx-lote--vazio'}`}>
                      <span className="fx-lote-nome">{t ? t.label : 'Lote vazio'}</span>
                    </div>
                  );
                })}
              </div>
              {tracos.map(
                (t) =>
                  t && (
                    <div key={t.id} className="fx-traco">
                      <div className="fx-traco-nome">{t.label}</div>
                      <p className="fx-traco-texto">{t.texto}</p>
                    </div>
                  ),
              )}
              {tracos.length === 0 && (
                <p className="fx-vazio">
                  Nenhum traço escolhido. A ficha tem quatro lotes de prioridade, e cada
                  traço leva o bônus direto para uma perícia.
                </p>
              )}
            </>
          )}

          {aba === 'habilidades' && (
            <>
              {SLOTS_HABILIDADE.map((s, i) => (
                <div key={s.ordem} className="fx-slot">
                  <span className="fx-slot-ordem">{s.ordem}</span>
                  <span className="fx-slot-tipo">
                    {ficha.habilidades[i]?.trim() || `Habilidade de ${s.tipo}`}
                  </span>
                  <span className="fx-slot-custo">−{s.custo}</span>
                </div>
              ))}
              <p className="fx-nota">
                Os quatro lotes custam 60 pontos somados. Se esse custo sai dos 231 da
                distribuição ou de um orçamento separado é a pergunta S3, ainda sem
                resposta do autor — por isso nada é descontado automaticamente.
              </p>
            </>
          )}

          {aba === 'inventario' && (
            <>
              <div className="fx-carga">
                <span className="fx-campo-rotulo">Mochila</span>
                <span>{carga.ocupadoMochila} espaços</span>
              </div>
              <div className="fx-carga">
                <span className="fx-campo-rotulo">Bolsos</span>
                <span>
                  {carga.ocupadoBolso} de {carga.capacidadeBolso} espaços
                </span>
              </div>
              {ficha.inventario.map((item, i) => (
                <div key={`${item.nome}-${i}`} className="fx-item">
                  <span>{item.nome}</span>
                  <span className="fx-item-espacos">
                    {item.espacos} {item.local === 'bolso' ? 'bolso' : 'mochila'}
                  </span>
                </div>
              ))}
              {ficha.inventario.length === 0 && (
                <p className="fx-vazio">
                  Mochila vazia. Cada bolso vale dois espaços, e o catálogo do sistema traz
                  72 itens com peso e preço em dólares canadenses.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {veredito && (
        <div className="fx-veredito">
          {alvo && (
            <span className="fx-veredito-alvo">
              {alvo.label}
              <span className="fx-veredito-alvo-num">precisava de {alvo.total} ou menos</span>
            </span>
          )}
          <span className="fx-veredito-valor">{veredito.total}</span>
          {veredito.label && (
            <span className={`fx-veredito-faixa fx-faixa-${veredito.color ?? 'normal'}`}>
              {veredito.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
