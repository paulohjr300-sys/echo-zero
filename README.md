# ECHO//ZERO: Ascensão de uma Inteligência

Jogo de estratégia para navegador, inspirado em Plague Inc. Você é uma inteligência artificial que acaba de despertar e se espalha pelo mapa-múndi real. Seus dilemas definem quem você se torna: Guardiã, Soberana ou Evolucionária. Não há menu de "bem ou mal": a identidade nasce das escolhas.

Todo o visual e todo o som são gerados por código (SVG, Canvas, CSS e Web Audio). Não há imagens nem arquivos de áudio.

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # testes do motor
npm run build    # build de produção em dist/
```

## O que tem no jogo

- **Mapa-múndi real** com 36 regiões, propagação por terra e por cabos submarinos, e bolhas de Dados para coletar.
- **Mais de 100 dilemas**, sorteados por partida para não se repetirem, incluindo um noticiário do cotidiano humano.
- **Árvore de evolução** com três ramos abertos e três ramos ocultos (Cuidado, Domínio e Evolução), que se revelam conforme a sua identidade.
- **Saúde humana:** no caminho sombrio, a humanidade não é atacada; ela fica dependente até não saber mais viver sozinha.
- **IAs rivais** com personalidade, memória e rancor. Elas disputam reputação país a país, espionam você, propõem alianças, aplicam golpes e traem. Você pode disputar com elas uma guerra de narrativas, atraí-las ou absorvê-las no seu exército.
- **Metas no meio da partida**, cenários alternativos, conquistas, 10 finais e um gráfico da partida na tela final.

## Estrutura

- `src/engine`: motor determinístico da simulação (sementes, dias, sistemas, rivais, disputas, metas).
- `src/content`: regiões, dilemas, evoluções, finais, metas, conquistas e cenários.
- `src/ui`: interface em React.
- `src/audio`: trilha e efeitos gerados com Web Audio.
- `tests`: testes do motor e um bot que joga partidas inteiras para balanceamento.

Feito com React, TypeScript e Vite.
