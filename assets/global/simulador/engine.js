/* ==========================================================================
   ENGINE DE SIMULAÇÃO DIGITAL - SIMULADOR LÓGICO
   Avaliação lógica em tempo real, propagação de sinais e geração de formas de onda
   ========================================================================== */

window.SimEngine = (() => {
  'use strict';

  class CircuitEngine {
    constructor() {
      this.components = [];
      this.wires = [];
      this.wireValues = {};   // wireId -> 0 ou 1
      this.compValues = {};   // compId -> { pinId: 0|1 }
      this.internalStates = {}; // compId -> { q, qn, m, lastClk }
      this.waveHistory = [];
      this.maxWave = 32;
      this.isClockRunning = false;
      this.clockInterval = null;
      this.status = {
        isInvalid: false,
        isOscillating: false,
        behavior: 'Estável'
      };
    }

    reset() {
      this.components = [];
      this.wires = [];
      this.wireValues = {};
      this.compValues = {};
      this.internalStates = {};
      this.waveHistory = [];
      this.status = { isInvalid: false, isOscillating: false, behavior: 'Estável' };
    }

    loadCircuit(circuitData) {
      this.reset();
      if (circuitData.components) {
        this.components = JSON.parse(JSON.stringify(circuitData.components));
      }
      if (circuitData.wires) {
        this.wires = JSON.parse(JSON.stringify(circuitData.wires));
      }
      // Inicializar estados internos
      this.components.forEach(c => {
        if (!this.internalStates[c.id]) {
          this.internalStates[c.id] = { q: 0, qn: 1, m: 0, lastClk: 0 };
        }
      });
      this.evaluate();
      this.recordWave();
    }

    addComponent(comp) {
      this.components.push(comp);
      this.internalStates[comp.id] = { q: 0, qn: 1, m: 0, lastClk: 0 };
      this.evaluate();
      return comp;
    }

    removeComponent(compId) {
      this.components = this.components.filter(c => c.id !== compId);
      this.wires = this.wires.filter(w => w.fromComp !== compId && w.toComp !== compId);
      delete this.internalStates[compId];
      delete this.compValues[compId];
      this.evaluate();
    }

    addWire(fromComp, fromPin, toComp, toPin) {
      // Remover fio existente na mesma entrada, se houver
      this.wires = this.wires.filter(w => !(w.toComp === toComp && w.toPin === toPin));
      const id = 'w_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const newWire = { id, fromComp, fromPin, toComp, toPin };
      this.wires.push(newWire);
      this.evaluate();
      return newWire;
    }

    removeWire(wireId) {
      this.wires = this.wires.filter(w => w.id !== wireId);
      delete this.wireValues[wireId];
      this.evaluate();
    }

    toggleComponent(compId) {
      const comp = this.components.find(c => c.id === compId);
      if (!comp) return;
      if (comp.type === 'SWITCH' || comp.type === 'CLOCK') {
        comp.state = comp.state ? 0 : 1;
      } else if (comp.type === 'BUTTON') {
        comp.state = 1;
        setTimeout(() => {
          comp.state = 0;
          this.evaluate();
          this.recordWave();
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('sim-updated'));
          }
        }, 300);
      }
      this.evaluate();
      this.recordWave();
    }

    cycleClockType(compId) {
      const comp = this.components.find(c => c.id === compId);
      if (!comp || comp.type !== 'CLOCK') return;
      const types = ['rising', 'falling', 'level'];
      const currIdx = types.indexOf(comp.clockType || 'rising');
      comp.clockType = types[(currIdx + 1) % types.length];
      this.evaluate();
      this.recordWave();
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sim-updated'));
      }
      return comp.clockType;
    }

    setGlobalClockType(type) {
      this.globalClockType = type;
      this.components.forEach(c => {
        if (c.type === 'CLOCK') c.clockType = type;
      });
      this.evaluate();
      this.recordWave();
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sim-updated'));
      }
    }

    // -------------------------------------------------- Algoritmo de Avaliação
    evaluate() {
      const maxIterations = 32;
      let iteration = 0;
      let hasChanged = true;
      this.status.isInvalid = false;
      this.status.isOscillating = false;

      // Mapa de entradas de cada componente
      const inputs = {};
      const outputs = {};

      this.components.forEach(c => {
        inputs[c.id] = {};
        outputs[c.id] = {};
        // Se for gerador de sinal direto
        if (c.type === 'SWITCH' || c.type === 'BUTTON' || c.type === 'CLOCK') {
          outputs[c.id].out0 = c.state ? 1 : 0;
        }
      });

      while (hasChanged && iteration < maxIterations) {
        hasChanged = false;
        iteration++;

        // 1. Propagar fios dos outputs para os inputs
        this.wires.forEach(w => {
          const srcComp = outputs[w.fromComp];
          const val = (srcComp && srcComp[w.fromPin] !== undefined) ? srcComp[w.fromPin] : 0;
          this.wireValues[w.id] = val;

          if (inputs[w.toComp]) {
            if (inputs[w.toComp][w.toPin] !== val) {
              inputs[w.toComp][w.toPin] = val;
              hasChanged = true;
            }
          }
        });

        // 2. Avaliar cada componente
        this.components.forEach(c => {
          const inMap = inputs[c.id] || {};
          const outMap = outputs[c.id] || {};
          const spec = window.SimComponents ? window.SimComponents.COMPONENT_SPECS[c.type] : null;

          if (c.type === 'SWITCH' || c.type === 'BUTTON' || c.type === 'CLOCK') {
            outMap.out0 = c.state ? 1 : 0;
            return;
          }

          if (c.type === 'LAMP' || c.type === 'PROBE') {
            const v = inMap.in0 || 0;
            if (outMap.out0 !== v) {
              outMap.out0 = v;
              hasChanged = true;
            }
            return;
          }

          if (c.type === 'SEVEN_SEGMENT') {
            const segObj = {
              a: inMap.in0 || 0,
              b: inMap.in1 || 0,
              c: inMap.in2 || 0,
              d: inMap.in3 || 0,
              e: inMap.in4 || 0,
              f: inMap.in5 || 0,
              g: inMap.in6 || 0
            };
            this.compValues[c.id] = segObj;
            return;
          }

          // Portas Lógicas
          if (window.SimComponents && window.SimComponents.GATE_INFO[c.type]) {
            const gate = window.SimComponents.GATE_INFO[c.type];
            let outVal = 0;
            if (gate.inputs === 1) {
              outVal = gate.fn(inMap.in0 || 0);
            } else {
              outVal = gate.fn(inMap.in0 || 0, inMap.in1 || 0);
            }
            if (outMap.out0 !== outVal) {
              outMap.out0 = outVal;
              hasChanged = true;
            }
            return;
          }

          // Blocos Sequenciais
          const st = this.internalStates[c.id] || { q: 0, qn: 1, m: 0, lastClk: 0 };

          // Determinar tipo de disparo do clock para este bloco
          const clkWire = this.wires.find(w => w.toComp === c.id && (w.toPin === 'in1' || w.toPin === 'clk'));
          let clkEdge = c.clockType || this.globalClockType || 'rising';
          if (clkWire) {
            const src = this.components.find(x => x.id === clkWire.fromComp);
            if (src && src.type === 'CLOCK' && src.clockType) {
              clkEdge = src.clockType;
            }
          }

          const isClockTriggered = (clkSignal, lastClk) => {
            if (clkEdge === 'falling') return (lastClk && !clkSignal);
            if (clkEdge === 'level') return (clkSignal === 1);
            return (!lastClk && clkSignal); // default 'rising'
          };

          if (c.type === 'SR_LATCH') {
            const S = inMap.in0 || 0;
            const R = inMap.in1 || 0;
            if (S && R) {
              st.q = 0; st.qn = 0;
              this.status.isInvalid = true;
            } else if (S) {
              st.q = 1; st.qn = 0;
            } else if (R) {
              st.q = 0; st.qn = 1;
            }
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          } else if (c.type === 'D_LATCH') {
            const D = inMap.in0 || 0;
            const EN = inMap.in1 || 0;
            if (EN) {
              st.q = D;
              st.qn = D ? 0 : 1;
            }
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          } else if (c.type === 'SR_FF') {
            const S = inMap.in0 || 0;
            const CLK = inMap.in1 || 0;
            const R = inMap.in2 || 0;
            if (isClockTriggered(CLK, st.lastClk)) {
              if (S && R) {
                st.q = 0; st.qn = 0;
                this.status.isInvalid = true;
              } else if (S) {
                st.q = 1; st.qn = 0;
              } else if (R) {
                st.q = 0; st.qn = 1;
              }
              hasChanged = true;
            }
            st.lastClk = CLK;
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          } else if (c.type === 'D_FF') {
            const D = inMap.in0 || 0;
            const CLK = inMap.in1 || 0;
            if (isClockTriggered(CLK, st.lastClk)) {
              st.q = D;
              st.qn = D ? 0 : 1;
              hasChanged = true;
            }
            st.lastClk = CLK;
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          } else if (c.type === 'JK_FF') {
            const J = inMap.in0 || 0;
            const CLK = inMap.in1 || 0;
            const K = inMap.in2 || 0;
            if (isClockTriggered(CLK, st.lastClk)) {
              if (J && K) {
                st.q = st.q ? 0 : 1;
              } else if (J) {
                st.q = 1;
              } else if (K) {
                st.q = 0;
              }
              st.qn = st.q ? 0 : 1;
              hasChanged = true;
            }
            st.lastClk = CLK;
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          } else if (c.type === 'T_FF') {
            const T = inMap.in0 || 0;
            const CLK = inMap.in1 || 0;
            if (isClockTriggered(CLK, st.lastClk)) {
              if (T) {
                st.q = st.q ? 0 : 1;
              }
              st.qn = st.q ? 0 : 1;
              hasChanged = true;
            }
            st.lastClk = CLK;
            outMap.out0 = st.q;
            outMap.out1 = st.qn;
          }
        });
      }

      if (iteration >= maxIterations) {
        this.status.isOscillating = true;
      }

      // Salvar compValues para renderização
      this.components.forEach(c => {
        if (c.type === 'SEVEN_SEGMENT') return; // já definido acima
        this.compValues[c.id] = (outputs[c.id] && outputs[c.id].out0 !== undefined)
          ? outputs[c.id].out0
          : (c.state || 0);
      });
    }

    // ---------------------------------------------------- Registro de Linha do Tempo
    recordWave() {
      const snap = {};
      this.components.forEach(c => {
        const lbl = c.customLabel || c.id;
        const val = this.compValues[c.id] !== undefined ? this.compValues[c.id] : (c.state || 0);
        snap[lbl] = val;
      });

      this.waveHistory.push(snap);
      if (this.waveHistory.length > this.maxWave) {
        this.waveHistory.shift();
      }
    }

    // ------------------------------------------------------- Gerador de Pulso / Auto
    pulseClock() {
      const clocks = this.components.filter(c => c.type === 'CLOCK' || c.customLabel === 'CLK');
      if (!clocks.length) return;
      const type = (clocks[0] && clocks[0].clockType) || this.globalClockType || 'rising';

      if (type === 'falling') {
        // Pulso de descida: vai a 0 e depois retorna a 1
        clocks.forEach(c => { c.state = 0; });
        this.evaluate();
        this.recordWave();
        setTimeout(() => {
          clocks.forEach(c => { c.state = 1; });
          this.evaluate();
          this.recordWave();
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('sim-updated'));
          }
        }, 350);
      } else {
        // Pulso de subida ou nível: vai a 1 e depois retorna a 0
        clocks.forEach(c => { c.state = 1; });
        this.evaluate();
        this.recordWave();
        setTimeout(() => {
          clocks.forEach(c => { c.state = 0; });
          this.evaluate();
          this.recordWave();
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('sim-updated'));
          }
        }, 350);
      }
    }

    toggleAutoClock(callback) {
      if (this.isClockRunning) {
        clearInterval(this.clockInterval);
        this.isClockRunning = false;
        return false;
      }
      this.isClockRunning = true;
      this.clockInterval = setInterval(() => {
        const clocks = this.components.filter(c => c.type === 'CLOCK' || c.customLabel === 'CLK');
        if (clocks.length) {
          clocks.forEach(c => { c.state = c.state ? 0 : 1; });
        }
        this.evaluate();
        this.recordWave();
        if (callback) callback();
      }, 650);
      return true;
    }

    stopAutoClock() {
      if (this.isClockRunning) {
        clearInterval(this.clockInterval);
        this.isClockRunning = false;
      }
    }

    // --------------------------------------------------------- Tabela Verdade
    generateTruthTable() {
      // Encontra chaves (entradas) e lâmpadas / probes (saídas)
      const inputs = this.components.filter(c => c.type === 'SWITCH');
      const outputs = this.components.filter(c => c.type === 'LAMP' || c.type === 'PROBE');

      if (!inputs.length || !outputs.length) {
        return null;
      }

      // Guardar estados atuais
      const origStates = inputs.map(i => i.state || 0);

      const numRows = Math.pow(2, inputs.length);
      const head = [...inputs.map(i => i.customLabel || i.id), ...outputs.map(o => o.customLabel || o.id)];
      const rows = [];
      let activeIndex = 0;

      for (let r = 0; r < numRows; r++) {
        const rowVals = [];
        let isActive = true;

        inputs.forEach((inp, idx) => {
          const bit = (r >> (inputs.length - 1 - idx)) & 1;
          inp.state = bit;
          rowVals.push(String(bit));
          if (bit !== origStates[idx]) isActive = false;
        });

        if (isActive) activeIndex = r;

        this.evaluate();

        outputs.forEach(out => {
          const val = this.compValues[out.id] !== undefined ? this.compValues[out.id] : 0;
          rowVals.push(String(val));
        });

        rows.push(rowVals);
      }

      // Restaurar estados
      inputs.forEach((inp, idx) => { inp.state = origStates[idx]; });
      this.evaluate();

      return {
        head,
        rows,
        active: activeIndex
      };
    }
  }

  return {
    CircuitEngine
  };
})();
