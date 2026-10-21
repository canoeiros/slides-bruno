/* ==========================================================================
   PRESETS DE CIRCUITOS LÓGICOS - SIMULADOR
   Circuitos pré-montados para portas lógicas, latches e flip-flops
   ========================================================================== */

window.SimPresets = (() => {
  'use strict';

  function createGatesPreset(gateType = 'AND') {
    const isOneInput = gateType === 'NOT';
    const components = [];
    const wires = [];

    if (isOneInput) {
      components.push(
        { id: 'swA', type: 'SWITCH', x: 120, y: 180, rotation: 0, customLabel: 'A', state: 0 },
        { id: 'g0', type: gateType, x: 350, y: 180, rotation: 0, customLabel: gateType },
        { id: 'lampY', type: 'LAMP', x: 580, y: 180, rotation: 0, customLabel: 'Y' }
      );
      wires.push(
        { id: 'w1', fromComp: 'swA', fromPin: 'out0', toComp: 'g0', toPin: 'in0' },
        { id: 'w2', fromComp: 'g0', fromPin: 'out0', toComp: 'lampY', toPin: 'in0' }
      );
    } else {
      components.push(
        { id: 'swA', type: 'SWITCH', x: 120, y: 130, rotation: 0, customLabel: 'A', state: 0 },
        { id: 'swB', type: 'SWITCH', x: 120, y: 230, rotation: 0, customLabel: 'B', state: 0 },
        { id: 'g0', type: gateType, x: 350, y: 180, rotation: 0, customLabel: gateType },
        { id: 'lampY', type: 'LAMP', x: 580, y: 180, rotation: 0, customLabel: 'Y' }
      );
      wires.push(
        { id: 'w1', fromComp: 'swA', fromPin: 'out0', toComp: 'g0', toPin: 'in0' },
        { id: 'w2', fromComp: 'swB', fromPin: 'out0', toComp: 'g0', toPin: 'in1' },
        { id: 'w3', fromComp: 'g0', fromPin: 'out0', toComp: 'lampY', toPin: 'in0' }
      );
    }

    return {
      tab: 'Portas',
      title: `Porta Lógica ${gateType}`,
      formula: window.SimComponents && window.SimComponents.GATE_INFO[gateType]
        ? window.SimComponents.GATE_INFO[gateType].expr
        : 'combinacional',
      clock: null,
      components,
      wires,
      note: window.SimComponents && window.SimComponents.GATE_INFO[gateType]
        ? `<b>${gateType}.</b> ${window.SimComponents.GATE_INFO[gateType].rule}. <span class="dim">Circuito combinacional: não guarda estado anterior.</span>`
        : ''
    };
  }

  const PRESETS = {
    gates: {
      tab: 'Portas',
      title: 'Portas Lógicas',
      formula: 'combinacional',
      clock: null,
      create: (options = {}) => createGatesPreset(options.gate || 'AND')
    },

    srNor: {
      tab: 'SR NOR',
      title: 'Latch SR — NOR',
      formula: 'S = 1 → SET · R = 1 → RESET',
      clock: null,
      create: () => ({
        tab: 'SR NOR',
        title: 'Latch SR — Portas NOR',
        formula: 'S = 1 → SET · R = 1 → RESET',
        clock: null,
        components: [
          { id: 'swS', type: 'SWITCH', x: 110, y: 95, rotation: 0, customLabel: 'S', state: 0 },
          { id: 'swR', type: 'SWITCH', x: 110, y: 265, rotation: 0, customLabel: 'R', state: 0 },
          { id: 'norTop', type: 'NOR', x: 310, y: 105, rotation: 0, customLabel: 'NOR 1' },
          { id: 'norBot', type: 'NOR', x: 310, y: 255, rotation: 0, customLabel: 'NOR 2' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 105, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 255, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wS', fromComp: 'swS', fromPin: 'out0', toComp: 'norTop', toPin: 'in0' },
          { id: 'wR', fromComp: 'swR', fromPin: 'out0', toComp: 'norBot', toPin: 'in1' },
          { id: 'wQ', fromComp: 'norTop', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'norBot', fromPin: 'out0', toComp: 'lampQn', toPin: 'in0' },
          // Realimentações cruzadas
          { id: 'wFeedQ', fromComp: 'norTop', fromPin: 'out0', toComp: 'norBot', toPin: 'in0' },
          { id: 'wFeedQn', fromComp: 'norBot', fromPin: 'out0', toComp: 'norTop', toPin: 'in1' }
        ],
        note: '<b>Latch SR (NOR).</b> Realimentação cruzada forma uma célula de memória de 1 bit. Com <b>S=1</b> faz SET (Q=1). Com <b>R=1</b> faz RESET (Q=0). Com <b>S=R=0</b> mantém o estado. <b>S=R=1</b> é estado inválido.'
      })
    },

    srNand: {
      tab: 'SR NAND',
      title: 'Latch SR — NAND',
      formula: 'S̄ e R̄ ativos em nível baixo (0)',
      clock: null,
      create: () => ({
        tab: 'SR NAND',
        title: 'Latch SR — Portas NAND',
        formula: 'S̄ e R̄ ativos em 0',
        clock: null,
        components: [
          { id: 'swS', type: 'SWITCH', x: 110, y: 95, rotation: 0, customLabel: 'S̄', state: 1 },
          { id: 'swR', type: 'SWITCH', x: 110, y: 265, rotation: 0, customLabel: 'R̄', state: 1 },
          { id: 'nandTop', type: 'NAND', x: 310, y: 105, rotation: 0, customLabel: 'NAND 1' },
          { id: 'nandBot', type: 'NAND', x: 310, y: 255, rotation: 0, customLabel: 'NAND 2' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 105, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 255, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wS', fromComp: 'swS', fromPin: 'out0', toComp: 'nandTop', toPin: 'in0' },
          { id: 'wR', fromComp: 'swR', fromPin: 'out0', toComp: 'nandBot', toPin: 'in1' },
          { id: 'wQ', fromComp: 'nandTop', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'nandBot', fromPin: 'out0', toComp: 'lampQn', toPin: 'in0' },
          // Realimentações cruzadas
          { id: 'wFeedQ', fromComp: 'nandTop', fromPin: 'out0', toComp: 'nandBot', toPin: 'in0' },
          { id: 'wFeedQn', fromComp: 'nandBot', fromPin: 'out0', toComp: 'nandTop', toPin: 'in1' }
        ],
        note: '<b>Latch SR (NAND).</b> Entradas ativas em nível 0 (baixo). Com <b>S̄=0</b> faz SET (Q=1). Com <b>R̄=0</b> faz RESET (Q=0). Com <b>S̄=R̄=1</b> mantém a memória. <b>S̄=R̄=0</b> é inválido.'
      })
    },

    dLatch: {
      tab: 'Latch D',
      title: 'Latch D — sensível a nível',
      formula: 'EN = 1 → transparente',
      clock: 'EN',
      create: () => ({
        tab: 'Latch D',
        title: 'Latch D — Transparência e Memória',
        formula: 'EN = 1 → copia D · EN = 0 → mantém',
        clock: 'EN',
        components: [
          { id: 'swD', type: 'SWITCH', x: 120, y: 130, rotation: 0, customLabel: 'D', state: 0 },
          { id: 'swEN', type: 'SWITCH', x: 120, y: 230, rotation: 0, customLabel: 'EN', state: 0 },
          { id: 'blkD', type: 'D_LATCH', x: 350, y: 180, rotation: 0, customLabel: 'LATCH D' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 160, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 200, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wD', fromComp: 'swD', fromPin: 'out0', toComp: 'blkD', toPin: 'in0' },
          { id: 'wEN', fromComp: 'swEN', fromPin: 'out0', toComp: 'blkD', toPin: 'in1' },
          { id: 'wQ', fromComp: 'blkD', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'blkD', fromPin: 'out1', toComp: 'lampQn', toPin: 'in0' }
        ],
        note: '<b>Latch D.</b> Com <b>EN=1</b> o circuito está transparente (Q segue D continuamente). Com <b>EN=0</b> a entrada é travada e Q armazena o último valor.'
      })
    },

    dff: {
      tab: 'FF D',
      title: 'Flip-flop D — borda de subida',
      formula: 'Q ← D na subida de CLK',
      clock: 'CLK',
      create: () => ({
        tab: 'FF D',
        title: 'Flip-Flop D — Disparo por Borda',
        formula: 'Q ← D na borda ↑ de CLK',
        clock: 'CLK',
        components: [
          { id: 'swD', type: 'SWITCH', x: 120, y: 130, rotation: 0, customLabel: 'D', state: 0 },
          { id: 'swCLK', type: 'CLOCK', x: 120, y: 230, rotation: 0, customLabel: 'CLK', state: 0 },
          { id: 'blkDFF', type: 'D_FF', x: 350, y: 180, rotation: 0, customLabel: 'FLIP-FLOP D' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 160, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 200, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wD', fromComp: 'swD', fromPin: 'out0', toComp: 'blkDFF', toPin: 'in0' },
          { id: 'wCLK', fromComp: 'swCLK', fromPin: 'out0', toComp: 'blkDFF', toPin: 'in1' },
          { id: 'wQ', fromComp: 'blkDFF', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'blkDFF', fromPin: 'out1', toComp: 'lampQn', toPin: 'in0' }
        ],
        note: '<b>Flip-Flop D.</b> O valor da entrada D é transferido para a saída Q <b>apenas na transição de subida (0 → 1)</b> do sinal de relógio CLK.'
      })
    },

    jk: {
      tab: 'FF JK',
      title: 'Flip-flop JK — borda de subida',
      formula: 'D = J·Q̄ + K̄·Q',
      clock: 'CLK',
      create: () => ({
        tab: 'FF JK',
        title: 'Flip-Flop JK Universal',
        formula: 'J=1: Set · K=1: Reset · J=K=1: Toggle',
        clock: 'CLK',
        components: [
          { id: 'swJ', type: 'SWITCH', x: 120, y: 110, rotation: 0, customLabel: 'J', state: 0 },
          { id: 'swCLK', type: 'CLOCK', x: 120, y: 180, rotation: 0, customLabel: 'CLK', state: 0 },
          { id: 'swK', type: 'SWITCH', x: 120, y: 250, rotation: 0, customLabel: 'K', state: 0 },
          { id: 'blkJK', type: 'JK_FF', x: 350, y: 180, rotation: 0, customLabel: 'FLIP-FLOP JK' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 155, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 205, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wJ', fromComp: 'swJ', fromPin: 'out0', toComp: 'blkJK', toPin: 'in0' },
          { id: 'wCLK', fromComp: 'swCLK', fromPin: 'out0', toComp: 'blkJK', toPin: 'in1' },
          { id: 'wK', fromComp: 'swK', fromPin: 'out0', toComp: 'blkJK', toPin: 'in2' },
          { id: 'wQ', fromComp: 'blkJK', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'blkJK', fromPin: 'out1', toComp: 'lampQn', toPin: 'in0' }
        ],
        note: '<b>Flip-Flop JK.</b> O flip-flop universal: com <b>J=K=1</b> ele inverte a saída (Toggle) a cada pulso de clock, sem nunca entrar em estado inválido.'
      })
    },

    tff: {
      tab: 'FF T',
      title: 'Flip-flop T — divisor por 2',
      formula: 'D = T ⊕ Q',
      clock: 'CLK',
      create: () => ({
        tab: 'FF T',
        title: 'Flip-Flop T (Toggle)',
        formula: 'T = 1: divide frequência por 2',
        clock: 'CLK',
        components: [
          { id: 'swT', type: 'SWITCH', x: 120, y: 140, rotation: 0, customLabel: 'T', state: 1 },
          { id: 'swCLK', type: 'CLOCK', x: 120, y: 220, rotation: 0, customLabel: 'CLK', state: 0 },
          { id: 'blkTFF', type: 'T_FF', x: 350, y: 180, rotation: 0, customLabel: 'FLIP-FLOP T' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 160, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 200, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wT', fromComp: 'swT', fromPin: 'out0', toComp: 'blkTFF', toPin: 'in0' },
          { id: 'wCLK', fromComp: 'swCLK', fromPin: 'out0', toComp: 'blkTFF', toPin: 'in1' },
          { id: 'wQ', fromComp: 'blkTFF', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'blkTFF', fromPin: 'out1', toComp: 'lampQn', toPin: 'in0' }
        ],
        note: '<b>Flip-Flop T.</b> Com <b>T=1</b> a saída Q alterna a cada borda de subida do CLK. Funciona como um <b>divisor de frequência por 2</b> e contador assíncrono.'
      })
    },

    srff: {
      tab: 'FF SR',
      title: 'Flip-flop SR — sincronizado',
      formula: 'Q ← S/R no disparo de CLK',
      clock: 'CLK',
      create: () => ({
        tab: 'FF SR',
        title: 'Flip-Flop SR Sincronizado',
        formula: 'S=1: Set · R=1: Reset (no pulso de CLK)',
        clock: 'CLK',
        components: [
          { id: 'swS', type: 'SWITCH', x: 120, y: 110, rotation: 0, customLabel: 'S', state: 0 },
          { id: 'swCLK', type: 'CLOCK', x: 120, y: 180, rotation: 0, customLabel: 'CLK', state: 0, clockType: 'rising' },
          { id: 'swR', type: 'SWITCH', x: 120, y: 250, rotation: 0, customLabel: 'R', state: 0 },
          { id: 'blkSR', type: 'SR_FF', x: 350, y: 180, rotation: 0, customLabel: 'FLIP-FLOP SR' },
          { id: 'lampQ', type: 'LAMP', x: 580, y: 155, rotation: 0, customLabel: 'Q' },
          { id: 'lampQn', type: 'LAMP', x: 580, y: 205, rotation: 0, customLabel: 'Q̄' }
        ],
        wires: [
          { id: 'wS', fromComp: 'swS', fromPin: 'out0', toComp: 'blkSR', toPin: 'in0' },
          { id: 'wCLK', fromComp: 'swCLK', fromPin: 'out0', toComp: 'blkSR', toPin: 'in1' },
          { id: 'wR', fromComp: 'swR', fromPin: 'out0', toComp: 'blkSR', toPin: 'in2' },
          { id: 'wQ', fromComp: 'blkSR', fromPin: 'out0', toComp: 'lampQ', toPin: 'in0' },
          { id: 'wQn', fromComp: 'blkSR', fromPin: 'out1', toComp: 'lampQn', toPin: 'in0' }
        ],
        note: '<b>Flip-Flop SR Sincronizado.</b> As mudanças nas saídas Q e Q̄ ocorrem <b>apenas no instante do pulso de clock</b> (borda de subida ou descida). Com <b>S=1</b> faz SET (Q=1). Com <b>R=1</b> faz RESET (Q=0). Com <b>S=R=0</b> mantém o valor anterior.'
      })
    },

    custom: {
      tab: 'Personalizado',
      title: 'Canva Livre — Crie seu Circuito',
      formula: 'Logic.ly Canva',
      clock: null,
      create: () => ({
        tab: 'Personalizado',
        title: 'Circuito Personalizado',
        formula: 'Canva Interativo',
        clock: null,
        components: [],
        wires: [],
        note: '<b>Canva Interativo.</b> Use a paleta lateral esquerda para adicionar portas lógicas, entradas, lâmpadas, probes e display de 7 segmentos. Arraste para mover, puxe fios nos terminais e renomeie labels.'
      })
    }
  };

  const TAB_GROUPS = [
    ['gates'],
    ['srNor', 'srNand', 'dLatch'],
    ['srff', 'dff', 'jk', 'tff'],
    ['custom']
  ];

  return {
    PRESETS,
    TAB_GROUPS,
    createGatesPreset
  };
})();
