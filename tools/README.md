# tools

## `contraste.py`

Mede o contraste real do texto do painel da ficha contra a cena 3D que passa
por trás do vidro.

```
python3 tools/contraste.py captura.png
```

Existe porque **nenhum teste unitário pega isso**. O painel é translúcido sobre
uma cena que muda: o foco quente da luminária da mesa atravessava o vidro e
derrubava o texto secundário para 2,2:1 — reprovado — sem quebrar nenhum teste
nem gerar erro de console. O defeito só aparece na imagem.

O script decodifica o PNG sem dependência externa e tira a **mediana de
luminância por linha**: o fundo domina em área e o glifo é minoria, então a
mediana estima o fundo sem precisar segmentar texto. Amostrar o máximo não
funciona — pega o próprio texto branco e devolve 1,00:1.

Limite adotado: **4,5:1** (WCAG AA para texto normal).

Medição de 05/09/2026, com `brightness(0.3)` no `backdrop-filter`:

| Amostra | Texto secundário | Texto primário |
|---|---|---|
| Celular 390×844 | 4,50:1 | 10,10:1 |
| Desktop 1280×860 | 4,65:1 | 10,44:1 |

O secundário passa raspando. Se a iluminação da mesa mudar, remedir antes de
publicar.
