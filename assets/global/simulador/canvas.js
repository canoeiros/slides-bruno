/* ==========================================================================
   CANVAS INTERATIVO - SIMULADOR LÓGICO ESTILO LOGIC.LY
   Mover, girar, compor componentes, puxar fios, pan e zoom
   ========================================================================== */

window.SimCanvas = (() => {
  'use strict';

  class CircuitCanvas {
    constructor(containerEl, engine) {
      this.container = containerEl;
      this.engine = engine;
      this.selectedCompId = null;
      this.selectedWireId = null;

      // Modo de Operação ('view' | 'move' | 'select')
      this.mode = 'view';

      // Transformação do Canvas (Pan e Zoom)
      this.view = {
        x: 0,
        y: 0,
        width: 760,
        height: 420,
        zoom: 1
      };
      this.baseWidth = 760;
      this.baseHeight = 420;

      // Estados de Interação
      this.isPanning = false;
      this.panStart = { x: 0, y: 0 };
      this.activeDragComp = null;
      this.dragOffset = { x: 0, y: 0 };
      this.dragHasMoved = false;

      // Puxar Fios
      this.isDrawingWire = false;
      this.wireStart = null; // { compId, pinId, x, y, type }
      this.wireCurrent = { x: 0, y: 0 };

      // Configuração de Grade
      this.snapGrid = true;
      this.gridSize = 10;

      this.initDOM();
      this.bindEvents();
    }

    initDOM() {
      this.container.innerHTML = `
        <svg id="circuitSvg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Canva do Circuito Lógico">
          <defs>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle id="gridDot" class="grid-dot" cx="2" cy="2" r="1.2" fill="#cbd5e1"/>
            </pattern>
          </defs>
          <rect id="bgRect" x="-5000" y="-5000" width="10000" height="10000" fill="url(#gridPattern)"/>
          <g id="wiresLayer"></g>
          <g id="componentsLayer"></g>
          <path id="tempWire" class="wire-drawing" d="" style="display: none;"/>
        </svg>

        <!-- Barra de Ações Rápidas do Componente Selecionado -->
        <div id="selectedBar" class="selected-actions-bar" style="display: none;">
          <span id="selectedLabel" class="sel-info">AND</span>
          <div class="sel-label-box" id="selLabelBox">
            <input type="text" id="inputCompLabel" class="input-comp-label" placeholder="Rótulo" title="Nome do componente (Ex: A, B, CLK, Saída)" maxlength="16">
            <button type="button" class="btn btn-sm" id="btnSaveLabel" title="Salvar novo rótulo">🏷 Salvar</button>
          </div>
          <button type="button" class="btn btn-sm" id="btnRotateSel" title="Girar 90° (Tecla R)">↻ Girar (R)</button>
          <button type="button" class="btn btn-sm danger" id="btnDeleteSel" title="Excluir (Tecla Del)">🗑 Excluir</button>
        </div>
      `;

      this.svg = this.container.querySelector('#circuitSvg');
      this.wiresLayer = this.container.querySelector('#wiresLayer');
      this.componentsLayer = this.container.querySelector('#componentsLayer');
      this.tempWire = this.container.querySelector('#tempWire');
      this.selectedBar = this.container.querySelector('#selectedBar');
      this.selectedLabel = this.container.querySelector('#selectedLabel');
      this.selLabelBox = this.container.querySelector('#selLabelBox');
      this.inputCompLabel = this.container.querySelector('#inputCompLabel');
      this.btnSaveLabel = this.container.querySelector('#btnSaveLabel');

      this.container.classList.add('mode-view');
      this.updateViewBox();
    }

    updateViewBox() {
      const vb = `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`;
      this.svg.setAttribute('viewBox', vb);
    }

    // ------------------------------------------------ Conversão de Coordenadas
    screenToCanvas(clientX, clientY) {
      const pt = this.svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = this.svg.getScreenCTM();
      if (ctm) {
        const inv = pt.matrixTransform(ctm.inverse());
        return { x: inv.x, y: inv.y };
      }
      const rect = this.svg.getBoundingClientRect();
      const scaleX = this.view.width / (rect.width || 1);
      const scaleY = this.view.height / (rect.height || 1);
      return {
        x: this.view.x + (clientX - rect.left) * scaleX,
        y: this.view.y + (clientY - rect.top) * scaleY
      };
    }

    snap(val) {
      if (!this.snapGrid) return Math.round(val);
      return Math.round(val / this.gridSize) * this.gridSize;
    }

    // --------------------------------------------------------- Renderização
    render() {
      if (!this.engine) return;

      // 1. Renderizar Fios
      let wiresHTML = '';
      this.engine.wires.forEach(w => {
        const fromComp = this.engine.components.find(c => c.id === w.fromComp);
        const toComp = this.engine.components.find(c => c.id === w.toComp);
        if (!fromComp || !toComp) return;

        const p1 = window.SimComponents.getPinWorldPos(fromComp, w.fromPin);
        const p2 = window.SimComponents.getPinWorldPos(toComp, w.toPin);
        const val = this.engine.wireValues[w.id] || 0;
        const isSelected = this.selectedWireId === w.id;

        const d = this.computeWireCurve(p1.x, p1.y, p2.x, p2.y);
        wiresHTML += `
          <path class="wire-path${isSelected ? ' selected' : ''}" data-wire-id="${w.id}" data-val="${val}" d="${d}"/>
        `;
      });
      this.wiresLayer.innerHTML = wiresHTML;

      // 2. Renderizar Componentes
      let compsHTML = '';
      this.engine.components.forEach(comp => {
        const isSelected = (this.mode !== 'view') && (this.selectedCompId === comp.id);
        compsHTML += window.SimComponents.renderComponentSVG(comp, isSelected, this.engine.compValues);
      });
      this.componentsLayer.innerHTML = compsHTML;

      // 3. Atualizar barra de seleção
      this.updateSelectionBar();
    }

    setMode(mode) {
      this.mode = mode; // 'view' | 'move' | 'select'
      this.container.classList.remove('mode-view', 'mode-move', 'mode-select');
      this.container.classList.add(`mode-${mode}`);
      if (mode === 'view') {
        this.clearSelection();
        this.cancelWireDrawing();
      }
      this.render();
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('editor-mode-changed', { detail: { mode } }));
      }
    }

    computeWireCurve(x1, y1, x2, y2) {
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dy < 4) {
        return `M ${x1} ${y1} L ${x2} ${y2}`;
      }
      // Curva suave estilo Logic.ly
      const curvature = Math.max(25, Math.min(120, dx * 0.5));
      return `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
    }

    updateSelectionBar() {
      if (!this.selectedBar) return;
      if (this.mode === 'view') {
        this.selectedBar.style.display = 'none';
        return;
      }
      if (this.selectedCompId) {
        const comp = this.engine.components.find(c => c.id === this.selectedCompId);
        if (comp) {
          const rot = comp.rotation || 0;
          this.selectedLabel.textContent = `${comp.customLabel || comp.type} (${rot}°)`;
          if (this.selLabelBox) {
            this.selLabelBox.style.display = 'flex';
            if (this.inputCompLabel && document.activeElement !== this.inputCompLabel) {
              this.inputCompLabel.value = comp.customLabel || comp.type;
            }
          }
          this.selectedBar.style.display = 'flex';
          return;
        }
      }
      if (this.selectedWireId) {
        this.selectedLabel.textContent = 'Fio Selecionado';
        if (this.selLabelBox) this.selLabelBox.style.display = 'none';
        this.selectedBar.style.display = 'flex';
        return;
      }
      this.selectedBar.style.display = 'none';
    }

    saveCompLabel() {
      if (!this.selectedCompId || !this.inputCompLabel) return;
      const comp = this.engine.components.find(c => c.id === this.selectedCompId);
      if (!comp) return;
      const val = this.inputCompLabel.value.trim();
      if (val) {
        comp.customLabel = val;
        this.render();
        this.notifyUpdate();
      }
    }

    // --------------------------------------------------- Ações dos Componentes
    selectComponent(compId) {
      this.selectedCompId = compId;
      this.selectedWireId = null;
      this.render();
    }

    selectWire(wireId) {
      this.selectedWireId = wireId;
      this.selectedCompId = null;
      this.render();
    }

    clearSelection() {
      this.selectedCompId = null;
      this.selectedWireId = null;
      this.render();
    }

    rotateSelected() {
      if (!this.selectedCompId) return;
      const comp = this.engine.components.find(c => c.id === this.selectedCompId);
      if (!comp) return;

      comp.rotation = ((comp.rotation || 0) + 90) % 360;
      this.engine.evaluate();
      this.render();
      this.notifyUpdate();
    }

    deleteSelected() {
      if (this.selectedCompId) {
        this.engine.removeComponent(this.selectedCompId);
        this.selectedCompId = null;
      } else if (this.selectedWireId) {
        this.engine.removeWire(this.selectedWireId);
        this.selectedWireId = null;
      }
      this.render();
      this.notifyUpdate();
    }

    addNewComponent(type, x, y) {
      const cx = x !== undefined ? this.snap(x) : this.snap(this.view.x + this.view.width / 2);
      const cy = y !== undefined ? this.snap(y) : this.snap(this.view.y + this.view.height / 2);

      const id = 'c_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 100);
      const newComp = {
        id,
        type,
        x: cx,
        y: cy,
        rotation: 0,
        customLabel: type,
        state: 0
      };

      this.engine.addComponent(newComp);
      this.selectComponent(id);
      this.notifyUpdate();
      return newComp;
    }

    notifyUpdate() {
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sim-updated'));
      }
    }

    // ---------------------------------------------------- Controles de Pan / Zoom
    zoomIn() {
      this.setZoom(this.view.zoom * 0.85);
    }

    zoomOut() {
      this.setZoom(this.view.zoom * 1.18);
    }

    resetZoom() {
      this.view.zoom = 1;
      this.view.width = this.baseWidth;
      this.view.height = this.baseHeight;
      this.view.x = 0;
      this.view.y = 0;
      this.updateViewBox();
    }

    setZoom(newZoomFactor) {
      const clamped = Math.max(0.4, Math.min(2.5, newZoomFactor));
      const cx = this.view.x + this.view.width / 2;
      const cy = this.view.y + this.view.height / 2;

      this.view.zoom = clamped;
      this.view.width = this.baseWidth * clamped;
      this.view.height = this.baseHeight * clamped;
      this.view.x = cx - this.view.width / 2;
      this.view.y = cy - this.view.height / 2;
      this.updateViewBox();
    }

    // -------------------------------------------------------- Event Handlers
    bindEvents() {
      // 0. Double-click para renomear componente (em modo editar ou mover)
      this.svg.addEventListener('dblclick', e => {
        if (this.mode === 'view') return;
        const compGroup = e.target.closest('.component-group');
        if (compGroup) {
          e.stopPropagation();
          const compId = compGroup.dataset.compId;
          const comp = this.engine.components.find(c => c.id === compId);
          if (comp) {
            const newName = prompt(`Editar rótulo do componente (${comp.type}):`, comp.customLabel || comp.type);
            if (newName !== null && newName.trim() !== '') {
              comp.customLabel = newName.trim();
              this.render();
              this.notifyUpdate();
            }
          }
        }
      });

      // 1. Mousedown / Pointerdown
      this.svg.addEventListener('pointerdown', e => {
        const pt = this.screenToCanvas(e.clientX, e.clientY);

        // A. Clique no badge do tipo de clock (Alternar Subida / Descida / Nível)
        const clkBadge = e.target.closest('.clock-mode-badge');
        if (clkBadge) {
          e.stopPropagation();
          const compId = clkBadge.dataset.compId;
          this.engine.cycleClockType(compId);
          this.render();
          this.notifyUpdate();
          return;
        }

        // B. MODO VISUALIZAR: Apenas interagir com entradas (chaves, botões, relógio)
        if (this.mode === 'view') {
          const compGroup = e.target.closest('.component-group');
          if (compGroup) {
            e.stopPropagation();
            const compId = compGroup.dataset.compId;
            const comp = this.engine.components.find(c => c.id === compId);
            if (comp && (comp.type === 'SWITCH' || comp.type === 'BUTTON' || comp.type === 'CLOCK')) {
              this.engine.toggleComponent(compId);
              this.render();
              this.notifyUpdate();
            }
            return;
          }
          // Panning do canva ainda acessível
          if (e.button === 0 || e.button === 1) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
          }
          return;
        }

        // C. MODO MOVER: Arrastar portas e componentes sem puxar fios
        if (this.mode === 'move') {
          const compGroup = e.target.closest('.component-group');
          if (compGroup) {
            e.stopPropagation();
            const compId = compGroup.dataset.compId;
            const comp = this.engine.components.find(c => c.id === compId);
            if (comp) {
              this.selectComponent(compId);
              this.activeDragComp = comp;
              this.dragOffset = { x: pt.x - comp.x, y: pt.y - comp.y };
              this.dragHasMoved = false;
              compGroup.classList.add('is-dragging');
            }
            return;
          }
          if (e.button === 0 || e.button === 1) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
          }
          return;
        }

        // D. MODO SELEÇÃO / EDITAR (Puxar fios, rotação, seleção completa)
        // D1. Clique no terminal / pino de conexão
        const pinEl = e.target.closest('.terminal-pin');
        if (pinEl) {
          e.stopPropagation();
          const compId = pinEl.dataset.compId;
          const pinId = pinEl.dataset.pinId;
          const pinType = pinEl.dataset.pinType;

          if (pinType === 'out') {
            this.isDrawingWire = true;
            this.wireStart = { compId, pinId, x: pt.x, y: pt.y };
            this.tempWire.style.display = 'block';
            this.tempWire.setAttribute('d', `M ${pt.x} ${pt.y} L ${pt.x} ${pt.y}`);
            return;
          } else if (pinType === 'in') {
            if (this.isDrawingWire && this.wireStart) {
              if (this.wireStart.compId !== compId) {
                this.engine.addWire(this.wireStart.compId, this.wireStart.pinId, compId, pinId);
                this.cancelWireDrawing();
                this.render();
                this.notifyUpdate();
                return;
              }
            }
          }
        }

        // D2. Clique no botão de rotação
        if (e.target.closest('.rotate-handle')) {
          e.stopPropagation();
          this.rotateSelected();
          return;
        }

        // D3. Clique no componente (arrastar ou selecionar)
        const compGroup = e.target.closest('.component-group');
        if (compGroup) {
          e.stopPropagation();
          const compId = compGroup.dataset.compId;
          const comp = this.engine.components.find(c => c.id === compId);
          if (comp) {
            this.selectComponent(compId);
            this.activeDragComp = comp;
            this.dragOffset = { x: pt.x - comp.x, y: pt.y - comp.y };
            this.dragHasMoved = false;
            compGroup.classList.add('is-dragging');
          }
          return;
        }

        // D4. Clique em fio existente
        const wirePath = e.target.closest('.wire-path');
        if (wirePath) {
          e.stopPropagation();
          this.selectWire(wirePath.dataset.wireId);
          return;
        }

        // D5. Clique no fundo vazio (Pan ou desseleção)
        this.clearSelection();
        if (e.button === 0 || e.button === 1) {
          this.isPanning = true;
          this.panStart = { x: e.clientX, y: e.clientY };
        }
      });

      // 2. Pointermove
      window.addEventListener('pointermove', e => {
        // A. Puxando fio
        if (this.isDrawingWire && this.wireStart) {
          const pt = this.screenToCanvas(e.clientX, e.clientY);
          const d = this.computeWireCurve(this.wireStart.x, this.wireStart.y, pt.x, pt.y);
          this.tempWire.setAttribute('d', d);
          return;
        }

        // B. Arrastando componente
        if (this.activeDragComp) {
          const pt = this.screenToCanvas(e.clientX, e.clientY);
          const nx = this.snap(pt.x - this.dragOffset.x);
          const ny = this.snap(pt.y - this.dragOffset.y);

          if (nx !== this.activeDragComp.x || ny !== this.activeDragComp.y) {
            this.activeDragComp.x = nx;
            this.activeDragComp.y = ny;
            this.dragHasMoved = true;
            this.render();
          }
          return;
        }

        // C. Panning no fundo
        if (this.isPanning) {
          const dx = (e.clientX - this.panStart.x) * (this.view.width / this.svg.clientWidth);
          const dy = (e.clientY - this.panStart.y) * (this.view.height / this.svg.clientHeight);
          this.view.x -= dx;
          this.view.y -= dy;
          this.panStart = { x: e.clientX, y: e.clientY };
          this.updateViewBox();
        }
      });

      // 3. Pointerup
      window.addEventListener('pointerup', e => {
        // Se estava puxando fio e soltou sobre um terminal de entrada
        if (this.isDrawingWire) {
          const pinEl = document.elementFromPoint(e.clientX, e.clientY);
          const targetPin = pinEl ? pinEl.closest('.terminal-pin') : null;
          if (targetPin && targetPin.dataset.pinType === 'in') {
            const compId = targetPin.dataset.compId;
            const pinId = targetPin.dataset.pinId;
            if (this.wireStart && this.wireStart.compId !== compId) {
              this.engine.addWire(this.wireStart.compId, this.wireStart.pinId, compId, pinId);
              this.render();
              this.notifyUpdate();
            }
          }
          this.cancelWireDrawing();
        }

        // Se arrastou componente
        if (this.activeDragComp) {
          // Se clicou rápido sem mover, e for chave/botão, alternar estado!
          if (!this.dragHasMoved && (this.activeDragComp.type === 'SWITCH' || this.activeDragComp.type === 'BUTTON')) {
            this.engine.toggleComponent(this.activeDragComp.id);
            this.render();
            this.notifyUpdate();
          }
          this.activeDragComp = null;
          this.dragHasMoved = false;
          this.notifyUpdate();
        }

        this.isPanning = false;
      });

      // 4. Zoom com a roda do mouse
      this.svg.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 0.9 : 1.1;
        this.setZoom(this.view.zoom * factor);
      }, { passive: false });

      // 5. Teclado (R = girar, Delete/Backspace = excluir)
      window.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'r' || e.key === 'R') {
          this.rotateSelected();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          this.deleteSelected();
        } else if (e.key === 'Escape') {
          this.cancelWireDrawing();
          this.clearSelection();
        }
      });

      // Botões da barra de ações do componente selecionado
      const btnRot = this.container.querySelector('#btnRotateSel');
      if (btnRot) btnRot.addEventListener('click', () => this.rotateSelected());

      const btnDel = this.container.querySelector('#btnDeleteSel');
      if (btnDel) btnDel.addEventListener('click', () => this.deleteSelected());

      if (this.btnSaveLabel) {
        this.btnSaveLabel.addEventListener('click', () => this.saveCompLabel());
      }
      if (this.inputCompLabel) {
        this.inputCompLabel.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            this.saveCompLabel();
            this.inputCompLabel.blur();
          }
        });
      }
    }

    cancelWireDrawing() {
      this.isDrawingWire = false;
      this.wireStart = null;
      if (this.tempWire) {
        this.tempWire.style.display = 'none';
        this.tempWire.setAttribute('d', '');
      }
    }
  }

  return {
    CircuitCanvas
  };
})();
