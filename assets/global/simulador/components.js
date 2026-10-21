/* ==========================================================================
   COMPONENTES E DEFINIÇÕES - SIMULADOR LÓGICO (CANVAS LOGIC.LY)
   Definições de portas lógicas, entradas, saídas, rotação e renderização SVG
   ========================================================================== */

window.SimComponents = (() => {
  'use strict';

  // ------------------------------------------------------------- Gates logic
  const GATE_INFO = {
    AND:  { label: 'AND',  inputs: 2, expr: 'Y = A · B',      rule: 'Y é 1 somente quando A = 1 e B = 1', fn: (a, b) => (a && b) ? 1 : 0 },
    OR:   { label: 'OR',   inputs: 2, expr: 'Y = A + B',      rule: 'Y é 1 quando pelo menos uma entrada é 1', fn: (a, b) => (a || b) ? 1 : 0 },
    NOT:  { label: 'NOT',  inputs: 1, expr: 'Y = ¬A',         rule: 'Y é o complemento inverso de A', fn: (a) => a ? 0 : 1 },
    NAND: { label: 'NAND', inputs: 2, expr: 'Y = ¬(A · B)',   rule: 'AND invertida: Y = 0 somente se A = B = 1', fn: (a, b) => (a && b) ? 0 : 1 },
    NOR:  { label: 'NOR',  inputs: 2, expr: 'Y = ¬(A + B)',   rule: 'OR invertida: Y = 1 somente se A = B = 0', fn: (a, b) => (a || b) ? 0 : 1 },
    XOR:  { label: 'XOR',  inputs: 2, expr: 'Y = A ⊕ B',      rule: 'Y é 1 quando as entradas são diferentes', fn: (a, b) => a !== b ? 1 : 0 },
    XNOR: { label: 'XNOR', inputs: 2, expr: 'Y = ¬(A ⊕ B)',   rule: 'Y é 1 quando as entradas são iguais', fn: (a, b) => a === b ? 1 : 0 }
  };

  // ------------------------------------------------ Component Specifications
  const COMPONENT_SPECS = {
    // Portas Lógicas
    AND: {
      type: 'AND', category: 'gate', name: 'Porta AND',
      width: 70, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -38, y: -12 }, { id: 'in1', label: 'B', x: -38, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 38, y: 0 }]
    },
    OR: {
      type: 'OR', category: 'gate', name: 'Porta OR',
      width: 70, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -38, y: -12 }, { id: 'in1', label: 'B', x: -38, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 38, y: 0 }]
    },
    NOT: {
      type: 'NOT', category: 'gate', name: 'Porta NOT (Inversor)',
      width: 60, height: 40,
      inputs: [{ id: 'in0', label: 'A', x: -32, y: 0 }],
      outputs: [{ id: 'out0', label: 'Y', x: 34, y: 0 }]
    },
    NAND: {
      type: 'NAND', category: 'gate', name: 'Porta NAND',
      width: 76, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -38, y: -12 }, { id: 'in1', label: 'B', x: -38, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 44, y: 0 }]
    },
    NOR: {
      type: 'NOR', category: 'gate', name: 'Porta NOR',
      width: 76, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -38, y: -12 }, { id: 'in1', label: 'B', x: -38, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 44, y: 0 }]
    },
    XOR: {
      type: 'XOR', category: 'gate', name: 'Porta XOR',
      width: 76, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -42, y: -12 }, { id: 'in1', label: 'B', x: -42, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 38, y: 0 }]
    },
    XNOR: {
      type: 'XNOR', category: 'gate', name: 'Porta XNOR',
      width: 82, height: 50,
      inputs: [{ id: 'in0', label: 'A', x: -42, y: -12 }, { id: 'in1', label: 'B', x: -42, y: 12 }],
      outputs: [{ id: 'out0', label: 'Y', x: 44, y: 0 }]
    },

    // Entradas
    SWITCH: {
      type: 'SWITCH', category: 'input', name: 'Chave Alternadora (0/1)',
      width: 66, height: 32,
      inputs: [],
      outputs: [{ id: 'out0', label: 'S', x: 33, y: 0 }]
    },
    BUTTON: {
      type: 'BUTTON', category: 'input', name: 'Botão de Pulso',
      width: 66, height: 32,
      inputs: [],
      outputs: [{ id: 'out0', label: 'P', x: 33, y: 0 }]
    },
    CLOCK: {
      type: 'CLOCK', category: 'input', name: 'Gerador de Clock',
      width: 78, height: 36,
      inputs: [],
      outputs: [{ id: 'out0', label: 'CLK', x: 39, y: 0 }]
    },

    // Saídas
    LAMP: {
      type: 'LAMP', category: 'output', name: 'Lâmpada Indicadora',
      width: 52, height: 52,
      inputs: [{ id: 'in0', label: 'IN', x: -26, y: 0 }],
      outputs: []
    },
    PROBE: {
      type: 'PROBE', category: 'output', name: 'Terminal de Saída (Probe)',
      width: 44, height: 44,
      inputs: [{ id: 'in0', label: 'IN', x: -22, y: 0 }],
      outputs: []
    },
    SEVEN_SEGMENT: {
      type: 'SEVEN_SEGMENT', category: 'display', name: 'Display 7 Segmentos',
      width: 104, height: 136,
      inputs: [
        { id: 'in0', label: 'a', x: -46, y: -45 },
        { id: 'in1', label: 'b', x: -46, y: -30 },
        { id: 'in2', label: 'c', x: -46, y: -15 },
        { id: 'in3', label: 'd', x: -46, y: 0 },
        { id: 'in4', label: 'e', x: -46, y: 15 },
        { id: 'in5', label: 'f', x: -46, y: 30 },
        { id: 'in6', label: 'g', x: -46, y: 45 }
      ],
      outputs: []
    },

    // Blocos Funcionais
    SR_LATCH: {
      type: 'SR_LATCH', category: 'block', name: 'Latch SR',
      width: 130, height: 90,
      inputs: [{ id: 'in0', label: 'S', x: -65, y: -22 }, { id: 'in1', label: 'R', x: -65, y: 22 }],
      outputs: [{ id: 'out0', label: 'Q', x: 65, y: -22 }, { id: 'out1', label: 'Q̄', x: 65, y: 22 }]
    },
    D_LATCH: {
      type: 'D_LATCH', category: 'block', name: 'Latch D',
      width: 130, height: 90,
      inputs: [{ id: 'in0', label: 'D', x: -65, y: -20 }, { id: 'in1', label: 'EN', x: -65, y: 20 }],
      outputs: [{ id: 'out0', label: 'Q', x: 65, y: -20 }, { id: 'out1', label: 'Q̄', x: 65, y: 20 }]
    },
    SR_FF: {
      type: 'SR_FF', category: 'block', name: 'Flip-Flop SR',
      width: 140, height: 104,
      inputs: [
        { id: 'in0', label: 'S', x: -70, y: -26 },
        { id: 'in1', label: 'CLK', x: -70, y: 0, isClock: true },
        { id: 'in2', label: 'R', x: -70, y: 26 }
      ],
      outputs: [
        { id: 'out0', label: 'Q', x: 70, y: -22 },
        { id: 'out1', label: 'Q̄', x: 70, y: 22 }
      ]
    },
    D_FF: {
      type: 'D_FF', category: 'block', name: 'Flip-Flop D',
      width: 140, height: 90,
      inputs: [{ id: 'in0', label: 'D', x: -70, y: -20 }, { id: 'in1', label: 'CLK', x: -70, y: 20, isClock: true }],
      outputs: [{ id: 'out0', label: 'Q', x: 70, y: -20 }, { id: 'out1', label: 'Q̄', x: 70, y: 20 }]
    },
    JK_FF: {
      type: 'JK_FF', category: 'block', name: 'Flip-Flop JK',
      width: 140, height: 110,
      inputs: [
        { id: 'in0', label: 'J', x: -70, y: -30 },
        { id: 'in1', label: 'CLK', x: -70, y: 0, isClock: true },
        { id: 'in2', label: 'K', x: -70, y: 30 }
      ],
      outputs: [{ id: 'out0', label: 'Q', x: 70, y: -25 }, { id: 'out1', label: 'Q̄', x: 70, y: 25 }]
    },
    T_FF: {
      type: 'T_FF', category: 'block', name: 'Flip-Flop T',
      width: 140, height: 90,
      inputs: [{ id: 'in0', label: 'T', x: -70, y: -20 }, { id: 'in1', label: 'CLK', x: -70, y: 20, isClock: true }],
      outputs: [{ id: 'out0', label: 'Q', x: 70, y: -20 }, { id: 'out1', label: 'Q̄', x: 70, y: 20 }]
    }
  };

  // --------------------------------------------- Transformation Trigonometry
  function transformPoint(cx, cy, px, py, rotation = 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: Math.round(cx + px * cos - py * sin),
      y: Math.round(cy + px * sin + py * cos)
    };
  }

  function getPinWorldPos(comp, pinId) {
    const spec = COMPONENT_SPECS[comp.type];
    if (!spec) return { x: comp.x, y: comp.y };
    const pin = [...spec.inputs, ...spec.outputs].find(p => p.id === pinId);
    if (!pin) return { x: comp.x, y: comp.y };
    return transformPoint(comp.x, comp.y, pin.x, pin.y, comp.rotation || 0);
  }

  // ------------------------------------------------------- SVG Body Builders
  function renderGateBody(type) {
    const x0 = -26, x1 = 20, y0 = -22, y1 = 22;
    const cx = 0, cy = 0;

    let body = '';
    if (type === 'AND' || type === 'NAND') {
      body = `<path class="comp-body" d="M ${x0} ${y0} L ${cx} ${y0} A 22 22 0 0 1 ${cx} ${y1} L ${x0} ${y1} Z"/>`;
    } else if (type === 'NOT') {
      body = `<path class="comp-body" d="M ${x0 - 4} ${y0 + 4} L ${x1} ${cy} L ${x0 - 4} ${y1 - 4} Z"/>`;
    } else {
      // OR, NOR, XOR, XNOR
      body = `<path class="comp-body" d="M ${x0} ${y0} C ${x0 + 18} ${y0} ${x1 - 8} ${cy - 6} ${x1} ${cy} C ${x1 - 8} ${cy + 6} ${x0 + 18} ${y1} ${x0} ${y1} C ${x0 + 10} ${cy + 10} ${x0 + 10} ${cy - 10} ${x0} ${y0} Z"/>`;
      if (type === 'XOR' || type === 'XNOR') {
        body += `<path class="comp-body-arc" d="M ${x0 - 8} ${y0} Q ${x0 + 2} ${cy} ${x0 - 8} ${y1}"/>`;
      }
    }

    const bubbled = ['NAND', 'NOR', 'XNOR', 'NOT'].includes(type);
    let bubble = '';
    if (bubbled) {
      const bx = (type === 'AND' || type === 'NAND') ? cx + 22 : (type === 'NOT' ? x1 + 4 : x1 + 4);
      bubble = `<circle class="gate-bubble" cx="${bx}" cy="${cy}" r="4.5"/>`;
    }

    return body + bubble;
  }

  function renderComponentSVG(comp, isSelected = false, outputVals = {}) {
    const spec = COMPONENT_SPECS[comp.type];
    if (!spec) return '';

    const rot = comp.rotation || 0;
    const outVal = outputVals[comp.id] !== undefined ? outputVals[comp.id] : (comp.state || 0);

    let innerContent = '';

    if (spec.category === 'gate') {
      const body = renderGateBody(comp.type);
      innerContent = `
        ${body}
        <text class="comp-label" x="0" y="-28">${comp.customLabel || comp.type}</text>
      `;
    } else if (comp.type === 'SWITCH') {
      innerContent = `
        <rect class="sw-bg" x="-33" y="-16" width="66" height="32" rx="8"/>
        <circle class="sw-led" cx="-18" cy="0" r="4.5"/>
        <text class="sw-val" x="12" y="5">${outVal}</text>
        <text class="comp-label" x="-33" y="-22" text-anchor="start">${comp.customLabel || 'CHAVE'}</text>
      `;
    } else if (comp.type === 'BUTTON') {
      innerContent = `
        <rect class="sw-bg" x="-33" y="-16" width="66" height="32" rx="8"/>
        <circle class="sw-led" cx="-18" cy="0" r="4.5"/>
        <text class="sw-val" x="12" y="5">${outVal ? 'P' : '0'}</text>
        <text class="comp-label" x="-33" y="-22" text-anchor="start">${comp.customLabel || 'PULSO'}</text>
      `;
    } else if (comp.type === 'CLOCK') {
      const clkType = comp.clockType || 'rising';
      const clkTypeLabel = clkType === 'falling' ? '↓ Descida' : (clkType === 'level' ? '⎍ Nível' : '↑ Subida');
      innerContent = `
        <rect class="sw-bg" x="-39" y="-18" width="78" height="36" rx="8"/>
        <path d="M -30 2 L -30 -6 L -20 -6 L -20 2 L -10 2 L -10 -6" fill="none" stroke="${outVal ? '#34d399' : '#64748b'}" stroke-width="1.8"/>
        <text class="sw-val" x="22" y="3">${outVal}</text>
        <g class="clock-mode-badge" data-comp-id="${comp.id}" cursor="pointer">
          <rect class="clock-mode-bg" x="-35" y="6" width="50" height="9.5" rx="3"/>
          <text class="clock-mode-txt" x="-10" y="13.5" text-anchor="middle" font-size="6.5" font-weight="700" pointer-events="none">${clkTypeLabel}</text>
        </g>
        <text class="comp-label" x="-39" y="-22" text-anchor="start">${comp.customLabel || 'CLK'}</text>
      `;
    } else if (comp.type === 'LAMP') {
      const isHi = !!outVal;
      innerContent = `
        ${isHi ? '<circle class="lamp-glow-outer" cx="0" cy="-2" r="26"/>' : ''}
        <circle class="lamp-glow" cx="0" cy="-2" r="18"/>
        <rect class="lamp-socket" x="-6" y="13" width="12" height="6" rx="2"/>
        <circle class="lamp-glass" cx="0" cy="-2" r="15"/>
        <path class="lamp-filament" d="M -4 4 L -2 -3 L 0 -5 L 2 -3 L 4 4" fill="none"/>
        <text class="comp-label" x="0" y="28" text-anchor="middle">${comp.customLabel || 'LÂMPADA'}</text>
      `;
    } else if (comp.type === 'PROBE') {
      const isHi = !!outVal;
      innerContent = `
        <circle class="probe-ring" cx="0" cy="0" r="18"/>
        <circle class="probe-center" cx="0" cy="0" r="13"/>
        <text class="probe-val" x="0" y="5" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="800" text-anchor="middle">${isHi ? '1' : '0'}</text>
        <text class="comp-label" x="0" y="27" text-anchor="middle">${comp.customLabel || 'OUT'}</text>
      `;
    } else if (comp.type === 'SEVEN_SEGMENT') {
      let segs = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 };
      if (typeof outVal === 'object' && outVal !== null) {
        segs = { ...segs, ...outVal };
      }
      const sA = segs.a ? 'seg-on' : 'seg-off';
      const sB = segs.b ? 'seg-on' : 'seg-off';
      const sC = segs.c ? 'seg-on' : 'seg-off';
      const sD = segs.d ? 'seg-on' : 'seg-off';
      const sE = segs.e ? 'seg-on' : 'seg-off';
      const sF = segs.f ? 'seg-on' : 'seg-off';
      const sG = segs.g ? 'seg-on' : 'seg-off';

      innerContent = `
        <!-- Corpo do display de 7 segmentos -->
        <rect class="seg-display-body" x="-32" y="-62" width="76" height="124" rx="8"/>
        <g class="seg-group" transform="translate(6, 0)">
          <!-- a: topo horizontal -->
          <polygon class="seg-item ${sA}" points="-2,-40 18,-40 14,-34 2,-34"/>
          <!-- b: topo-direita vertical -->
          <polygon class="seg-item ${sB}" points="19,-38 19,-2 14,-6 14,-33"/>
          <!-- c: base-direita vertical -->
          <polygon class="seg-item ${sC}" points="19,2 19,38 14,33 14,6"/>
          <!-- d: base horizontal -->
          <polygon class="seg-item ${sD}" points="-2,40 18,40 14,34 2,34"/>
          <!-- e: base-esquerda vertical -->
          <polygon class="seg-item ${sE}" points="-3,2 -3,38 2,33 2,6"/>
          <!-- f: topo-esquerda vertical -->
          <polygon class="seg-item ${sF}" points="-3,-38 -3,-2 2,-6 2,-33"/>
          <!-- g: centro horizontal -->
          <polygon class="seg-item ${sG}" points="-1,-3 17,-3 14,3 2,3"/>
        </g>
        <text class="comp-label" x="6" y="-68" text-anchor="middle">${comp.customLabel || 'DISPLAY 7-SEG'}</text>
      `;
    } else if (spec.category === 'block') {
      const w = spec.width, h = spec.height;
      const hw = w / 2, hh = h / 2;
      let pinLabels = '';
      spec.inputs.forEach(p => {
        const edgeMark = p.isClock
          ? `<path d="M ${p.x + 4} ${p.y - 5} L ${p.x + 12} ${p.y} L ${p.x + 4} ${p.y + 5}" fill="none" stroke="#60a5fa" stroke-width="1.6"/>`
          : '';
        const lx = p.isClock ? p.x + 16 : p.x + 10;
        pinLabels += `${edgeMark}<text class="pin-label" x="${lx}" y="${p.y + 3.5}" text-anchor="start">${p.label}</text>`;
      });
      spec.outputs.forEach(p => {
        pinLabels += `<text class="pin-label" x="${p.x - 10}" y="${p.y + 3.5}" text-anchor="end">${p.label}</text>`;
      });

      innerContent = `
        <rect class="block-body" x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="10"/>
        <text class="block-title" x="0" y="${-hh + 18}" text-anchor="middle">${comp.customLabel || spec.name}</text>
        ${pinLabels}
      `;
    }

    // Pins / Terminais
    let pinsSVG = '';
    spec.inputs.forEach(p => {
      pinsSVG += `<circle class="terminal-pin" data-comp-id="${comp.id}" data-pin-id="${p.id}" data-pin-type="in" cx="${p.x}" cy="${p.y}" r="4.5"><title>Entrada: ${p.label}</title></circle>`;
    });
    spec.outputs.forEach(p => {
      const pVal = outVal;
      pinsSVG += `<circle class="terminal-pin" data-val="${pVal ? '1' : '0'}" data-comp-id="${comp.id}" data-pin-id="${p.id}" data-pin-type="out" cx="${p.x}" cy="${p.y}" r="4.5"><title>Saída: ${p.label} (${pVal})</title></circle>`;
    });

    // Selection Halo & Rotation indicator
    let selBox = '';
    if (isSelected) {
      const pad = 8;
      const bx = -spec.width / 2 - pad;
      const by = -spec.height / 2 - pad;
      const bw = spec.width + pad * 2;
      const bh = spec.height + pad * 2;
      selBox = `
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-dasharray="4 3" pointer-events="none"/>
        <circle cx="0" cy="${by - 12}" r="5" fill="#8b5cf6" stroke="#fff" stroke-width="1.4" class="rotate-handle" data-comp-id="${comp.id}" cursor="grab"><title>Girar componente</title></circle>
        <line x1="0" y1="${by}" x2="0" y2="${by - 7}" stroke="#a78bfa" stroke-width="1.5"/>
      `;
    }

    return `
      <g class="component-group${isSelected ? ' is-selected' : ''}" id="comp_${comp.id}" data-comp-id="${comp.id}" data-val="${outVal ? '1' : '0'}" transform="translate(${comp.x}, ${comp.y}) rotate(${rot})">
        ${selBox}
        ${innerContent}
        ${pinsSVG}
      </g>
    `;
  }

  return {
    GATE_INFO,
    COMPONENT_SPECS,
    transformPoint,
    getPinWorldPos,
    renderComponentSVG
  };
})();
