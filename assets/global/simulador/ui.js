/* ==========================================================================
   UI, GERENCIADOR DE SEÇÕES E REDIMENSIONAMENTO - SIMULADOR LÓGICO
   Tabs, parâmetros na URL, redimensionamento de seções e oscilograma
   ========================================================================== */

window.SimUI = (() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const WAVE_COLOR_DARK = {
    A: '#fbbf24', B: '#fbbf24', S: '#fbbf24', R: '#fbbf24',
    D: '#fbbf24', J: '#fbbf24', K: '#fbbf24', T: '#fbbf24',
    EN: '#38bdf8', CLK: '#38bdf8',
    Q: '#34d399', Y: '#34d399',
    M: '#a78bfa'
  };

  const WAVE_COLOR_LIGHT = {
    A: '#d97706', B: '#d97706', S: '#d97706', R: '#d97706',
    D: '#d97706', J: '#d97706', K: '#d97706', T: '#d97706',
    EN: '#0284c7', CLK: '#0284c7',
    Q: '#059669', Y: '#059669',
    M: '#7c3aed'
  };


  class SimulatorUI {
    constructor(engine, canvas) {
      this.engine = engine;
      this.canvas = canvas;

      // Parâmetros de Visibilidade das Seções
      this.sectionConfig = {
        topbar: true,
        circuitPanel: true,
        side: true,
        bottom: true,
        palette: true,
        head: true,
        controls: true,
        floatingBtn: true
      };

      // Parâmetros de Redimensionamento
      this.resizeConfig = {
        enabled: true,
        sideWidth: 318,
        bottomHeight: 128
      };

      // Tema Padrão: Claro
      this.theme = 'light';

      this.currentScene = 'gates';
      this.currentGate = 'AND';

      this.loadSavedLayout();
      this.parseURLParameters();
      this.initSplitters();
      this.initEvents();
      this.applyTheme(this.theme);
      this.applyLayout();
    }

    // ---------------------------------------------- Parâmetros de URL Prontos
    parseURLParameters() {
      try {
        const params = new URLSearchParams(window.location.search);

        // Tema (?theme=light ou ?theme=dark)
        if (params.has('theme')) {
          const t = params.get('theme').toLowerCase();
          if (t === 'dark' || t === 'light') {
            this.theme = t;
          }
        }

        // A. Cena / Preset pré-carregado
        if (params.has('circuit') || params.has('preset')) {
          const c = params.get('circuit') || params.get('preset');
          if (window.SimPresets && window.SimPresets.PRESETS[c]) {
            this.currentScene = c;
          }
        }
        if (params.has('gate')) {
          const g = params.get('gate').toUpperCase();
          if (['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'].includes(g)) {
            this.currentGate = g;
          }
        }

        // B. Ocultar seções (?hide=topbar,bottom ou ?hide=panels ou ?only=circuit etc.)
        if (params.get('only') === 'circuit' || params.get('circuitOnly') === '1' || params.get('embed') === '1') {
          this.sectionConfig.topbar = false;
          this.sectionConfig.side = false;
          this.sectionConfig.bottom = false;
          this.sectionConfig.palette = false;
          this.sectionConfig.head = false;
          this.sectionConfig.floatingBtn = false;
        }

        if (params.has('hide')) {
          const list = params.get('hide').split(',').map(s => s.trim().toLowerCase());
          if (list.includes('panels') || list.includes('all')) {
            this.sectionConfig.topbar = false;
            this.sectionConfig.side = false;
            this.sectionConfig.bottom = false;
            this.sectionConfig.palette = false;
            this.sectionConfig.head = false;
            this.sectionConfig.floatingBtn = false;
          }
          list.forEach(k => {
            if (k === 'topbar' || k === 'header') this.sectionConfig.topbar = false;
            if (k === 'circuit' || k === 'circuit-panel') this.sectionConfig.circuitPanel = false;
            if (k === 'side' || k === 'aside') this.sectionConfig.side = false;
            if (k === 'bottom' || k === 'wave' || k === 'timeline') this.sectionConfig.bottom = false;
            if (k === 'palette') this.sectionConfig.palette = false;
            if (k === 'head' || k === 'scenehead' || k === 'scene-head') this.sectionConfig.head = false;
            if (k === 'controls' || k === 'zoom') this.sectionConfig.controls = false;
            if (k === 'floating' || k === 'floatingbtn' || k === 'floating-btn' || k === 'btn') this.sectionConfig.floatingBtn = false;
          });
        }
        ['topbar', 'circuitPanel', 'side', 'bottom', 'palette', 'head', 'controls', 'floatingBtn'].forEach(k => {
          if (params.get(k) === '0' || params.get(`hide${k[0].toUpperCase()}${k.slice(1)}`) === '1') {
            this.sectionConfig[k] = false;
          }
        });

        // Quando os painéis forem desativados juntos, ocultar botão flutuante e paleta por padrão (modo limpo/slide)
        if (!this.sectionConfig.topbar && !this.sectionConfig.side && !this.sectionConfig.bottom) {
          if (!params.has('floatingBtn') && !params.has('floating')) {
            this.sectionConfig.floatingBtn = false;
          }
          if (!params.has('palette') && !params.has('hidePalette') && !params.has('showPalette')) {
            this.sectionConfig.palette = false;
          }
          if (!params.has('head') && !params.has('hideHead') && (params.get('hide') || '').includes('panels')) {
            this.sectionConfig.head = false;
          }
        }

        // C. Parâmetro de redimensionamento (?resizable=1/0 ou ?resize=true/false)
        if (params.has('resizable') || params.has('resize')) {
          const r = params.get('resizable') || params.get('resize');
          this.resizeConfig.enabled = (r !== '0' && r !== 'false');
        }
        if (params.has('sideWidth')) {
          const sw = parseInt(params.get('sideWidth'), 10);
          if (sw >= 180 && sw <= 600) this.resizeConfig.sideWidth = sw;
        }
        if (params.has('bottomHeight')) {
          const bh = parseInt(params.get('bottomHeight'), 10);
          if (bh >= 60 && bh <= 350) this.resizeConfig.bottomHeight = bh;
        }
      } catch (_) {}
    }

    loadSavedLayout() {
      try {
        const savedTheme = localStorage.getItem('sim_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          this.theme = savedTheme;
        }
        const saved = localStorage.getItem('sim_layout_config');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.sideWidth) this.resizeConfig.sideWidth = p.sideWidth;
          if (p.bottomHeight) this.resizeConfig.bottomHeight = p.bottomHeight;
        }
      } catch (_) {}
    }

    applyTheme(theme) {
      this.theme = theme;
      const isLight = (theme === 'light');
      document.body.classList.toggle('theme-light', isLight);
      document.body.classList.toggle('theme-dark', !isLight);
      const btn = $('#btnThemeToggle');
      if (btn) {
        btn.textContent = isLight ? '🌙 Escuro' : '☀️ Claro';
        btn.title = isLight ? 'Alternar para tema escuro' : 'Alternar para tema claro';
      }
      const gridDot = $('#gridDot');
      if (gridDot) {
        gridDot.setAttribute('fill', isLight ? '#cbd5e1' : '#1e293b');
      }
      try {
        localStorage.setItem('sim_theme', theme);
      } catch (_) {}
      this.drawWave();
      if (this.canvas) this.canvas.render();
    }

    saveLayout() {
      try {
        localStorage.setItem('sim_layout_config', JSON.stringify({
          sideWidth: this.resizeConfig.sideWidth,
          bottomHeight: this.resizeConfig.bottomHeight
        }));
      } catch (_) {}
    }

    // ------------------------------------------------ Redimensionamento com Splitters
    initSplitters() {
      const stage = $('#secStage');
      const side = $('#secSide');
      const resizerH = $('#resizerH');
      const bottom = $('#secBottom');
      const resizerV = $('#resizerV');

      // A. Splitter Horizontal (Largura da barra lateral)
      if (resizerH && side && stage) {
        let isDraggingH = false;

        resizerH.addEventListener('pointerdown', e => {
          if (!this.resizeConfig.enabled) return;
          isDraggingH = true;
          resizerH.classList.add('is-resizing');
          resizerH.setPointerCapture(e.pointerId);
          document.body.style.cursor = 'col-resize';
        });

        window.addEventListener('pointermove', e => {
          if (!isDraggingH) return;
          const stageRect = stage.getBoundingClientRect();
          const newWidth = Math.max(180, Math.min(580, stageRect.right - e.clientX));
          this.resizeConfig.sideWidth = Math.round(newWidth);
          side.style.flex = `0 0 ${this.resizeConfig.sideWidth}px`;
        });

        window.addEventListener('pointerup', e => {
          if (!isDraggingH) return;
          isDraggingH = false;
          resizerH.classList.remove('is-resizing');
          document.body.style.cursor = '';
          this.saveLayout();
          try { resizerH.releasePointerCapture(e.pointerId); } catch (_) {}
        });
      }

      // B. Splitter Vertical (Altura da linha do tempo)
      if (resizerV && bottom) {
        let isDraggingV = false;

        resizerV.addEventListener('pointerdown', e => {
          if (!this.resizeConfig.enabled) return;
          isDraggingV = true;
          resizerV.classList.add('is-resizing');
          resizerV.setPointerCapture(e.pointerId);
          document.body.style.cursor = 'row-resize';
        });

        window.addEventListener('pointermove', e => {
          if (!isDraggingV) return;
          const cardRect = $('#simCard').getBoundingClientRect();
          const newHeight = Math.max(60, Math.min(350, cardRect.bottom - e.clientY - 12));
          this.resizeConfig.bottomHeight = Math.round(newHeight);
          bottom.style.flex = `0 0 ${this.resizeConfig.bottomHeight}px`;
          this.drawWave();
        });

        window.addEventListener('pointerup', e => {
          if (!isDraggingV) return;
          isDraggingV = false;
          resizerV.classList.remove('is-resizing');
          document.body.style.cursor = '';
          this.saveLayout();
          this.drawWave();
          try { resizerV.releasePointerCapture(e.pointerId); } catch (_) {}
        });
      }
    }

    applyLayout() {
      const card = $('#simCard');
      const side = $('#secSide');
      const bottom = $('#secBottom');
      const resizerH = $('#resizerH');
      const resizerV = $('#resizerV');

      if (side) side.style.flex = `0 0 ${this.resizeConfig.sideWidth}px`;
      if (bottom) bottom.style.flex = `0 0 ${this.resizeConfig.bottomHeight}px`;

      // Aplica visibilidade das seções
      card.classList.toggle('hide-topbar', !this.sectionConfig.topbar);
      card.classList.toggle('hide-circuit', !this.sectionConfig.circuitPanel);
      card.classList.toggle('hide-side', !this.sectionConfig.side);
      card.classList.toggle('hide-bottom', !this.sectionConfig.bottom);
      card.classList.toggle('hide-palette', !this.sectionConfig.palette);
      card.classList.toggle('hide-head', !this.sectionConfig.head);
      card.classList.toggle('hide-controls', !this.sectionConfig.controls);

      const pal = $('#compPalette');
      const btnOpen = $('#btnOpenPalette');
      if (!this.sectionConfig.palette) {
        if (pal) pal.classList.add('is-collapsed');
        if (btnOpen) btnOpen.style.display = 'none';
      }

      const floatingBtn = $('#floatingViewBtn');
      if (floatingBtn) {
        floatingBtn.style.display = this.sectionConfig.floatingBtn ? '' : 'none';
      }
      document.body.classList.toggle('hide-floating-btn', !this.sectionConfig.floatingBtn);

      // Mostrar/ocultar splitters se desativado por parâmetro
      if (resizerH) resizerH.style.display = this.resizeConfig.enabled ? '' : 'none';
      if (resizerV) resizerV.style.display = this.resizeConfig.enabled ? '' : 'none';

      // Atualiza botões e badges
      const hiddenCount = [
        !this.sectionConfig.topbar,
        !this.sectionConfig.circuitPanel,
        !this.sectionConfig.side,
        !this.sectionConfig.bottom
      ].filter(Boolean).length;

      const badge = $('#hiddenCountBadge');
      if (badge) {
        if (hiddenCount > 0 && this.sectionConfig.floatingBtn) {
          badge.textContent = String(hiddenCount);
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }

      this.updateModals();
      setTimeout(() => this.drawWave(), 60);
    }

    setSectionVisible(sec, visible) {
      if (this.sectionConfig.hasOwnProperty(sec)) {
        this.sectionConfig[sec] = !!visible;
        this.applyLayout();
      }
    }

    // ----------------------------------------------------- Gerenciador de Abas
    // ----------------------------------------------------- Gerenciador de Abas
    renderTabs() {
      const tabsEl = $('#tabs');
      const selectEl = $('#tabsSelect');
      if (!window.SimPresets) return;

      const groupNames = ['Portas Lógicas', 'Latches', 'Flip-Flops', 'Personalizado'];
      const tabsHTML = [];
      const selectHTML = [];

      window.SimPresets.TAB_GROUPS.forEach((group, gi) => {
        if (gi > 0) tabsHTML.push('<span class="tab-sep"></span>');
        const grpLabel = groupNames[gi] || `Grupo ${gi + 1}`;
        const opts = [];

        group.forEach(key => {
          const p = window.SimPresets.PRESETS[key];
          if (!p) return;
          const isActive = key === this.currentScene;
          tabsHTML.push(`<button type="button" class="tab${isActive ? ' active' : ''}" data-scene="${key}">${p.tab}</button>`);
          opts.push(`<option value="${key}"${isActive ? ' selected' : ''}>${p.tab} — ${p.title}</option>`);
        });

        selectHTML.push(`<optgroup label="${grpLabel}">${opts.join('')}</optgroup>`);
      });

      if (tabsEl) tabsEl.innerHTML = tabsHTML.join('');
      if (selectEl) {
        selectEl.innerHTML = selectHTML.join('');
        selectEl.value = this.currentScene;
      }
    }

    renderSceneHead() {
      const head = $('#sceneHead');
      if (!head) return;

      let titleHTML = '';
      if (this.currentScene === 'gates') {
        const order = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];
        titleHTML = `
          <div class="gate-picker" style="display: flex; gap: 3px; align-items: center;">
            ${order.map(g => `<button type="button" class="btn btn-sm${g === this.currentGate ? ' primary' : ''}" data-gate="${g}">${g}</button>`).join('')}
          </div>
          <span class="expr">${window.SimComponents.GATE_INFO[this.currentGate].expr}</span>
        `;
      } else {
        const p = window.SimPresets.PRESETS[this.currentScene];
        titleHTML = `
          <span class="scene-title">${p ? p.title : 'Circuito'}</span>
          <span class="expr">${p ? p.formula : ''}</span>
        `;
      }

      const currMode = this.canvas ? this.canvas.mode : 'view';

      head.innerHTML = `
        ${titleHTML}
        <!-- Segmented Editor Mode Controls -->
        <div class="editor-modes-bar" role="group" aria-label="Modo de Interação">
          <button type="button" class="mode-btn${currMode === 'view' ? ' active' : ''}" data-canvas-mode="view" title="Modo Visualizar: Controla apenas botões e chaves sem mover as portas">👁 Visualizar</button>
          <button type="button" class="mode-btn${currMode === 'move' ? ' active' : ''}" data-canvas-mode="move" title="Modo Mover: Move portas e canva livremente">✥ Mover</button>
          <button type="button" class="mode-btn${currMode === 'select' ? ' active' : ''}" data-canvas-mode="select" title="Modo Editar: Puxa fios, gira, exclui e renomeia">✎ Editar</button>
        </div>
        <div class="head-actions">
          <button type="button" class="btn btn-sm" id="btnFitCanvas" title="Enquadrar tela">⛶ Ajustar</button>
          <button type="button" class="btn btn-sm" id="btnClearCanvas" title="Limpar circuito">🗑 Limpar</button>
          <button class="btn-sec-hide" data-hide-sec="circuitPanel" title="Ocultar painel do circuito">✕</button>
        </div>
      `;
    }

    loadPreset(sceneKey, gate = null) {
      this.currentScene = sceneKey;
      if (gate) this.currentGate = gate;

      const presetDef = window.SimPresets.PRESETS[sceneKey];
      if (!presetDef) return;

      const data = presetDef.create({ gate: this.currentGate });
      this.engine.loadCircuit(data);
      this.canvas.resetZoom();
      this.canvas.render();

      this.renderTabs();
      this.renderSceneHead();
      this.updatePanels();
      this.drawWave();
      this.updateClockControls(data.clock);
    }

    updateClockControls(clkName) {
      const btnPulse = $('#btnPulse');
      const btnAuto = $('#btnAuto');
      const hint = $('#hint');
      const selClock = $('#selectClockType');

      const hasClock = !!clkName || this.engine.components.some(c => c.type === 'CLOCK');
      if (btnPulse) {
        btnPulse.disabled = !hasClock;
        btnPulse.textContent = hasClock ? `Pulso ${clkName || 'CLK'}` : 'Pulso';
      }
      if (btnAuto) btnAuto.disabled = !hasClock;
      if (selClock) {
        selClock.disabled = !hasClock;
        selClock.value = this.engine.globalClockType || 'rising';
      }
      if (hint) {
        const edge = this.engine.globalClockType || 'rising';
        const edgeLabel = edge === 'falling' ? 'descida (1 → 0)' : (edge === 'level' ? 'nível (estado)' : 'subida (0 → 1)');
        hint.textContent = hasClock
          ? `Relógio configurado para ${edgeLabel}`
          : 'Clique nas chaves para alternar 0/1';
      }
    }

    // ---------------------------------------------------- Painel Lateral e Tabela
    updatePanels() {
      // 1. Chips de Sinais
      const chipsEl = $('#chips');
      if (chipsEl) {
        const chips = [];
        this.engine.components.forEach(c => {
          const val = this.engine.compValues[c.id] || 0;
          const lbl = c.customLabel || c.id;
          chips.push(`<span class="chip" data-v="${val}"><span class="k">${lbl}</span><span class="v">${val}</span></span>`);
        });
        chipsEl.innerHTML = chips.join('') || '<span class="dim">Sem componentes</span>';
      }

      // 2. Estado / Comportamento
      const behEl = $('#behavior');
      if (behEl) {
        if (this.engine.status.isInvalid) {
          behEl.textContent = 'Inválido';
          behEl.className = 'beh invalid';
        } else if (this.engine.status.isOscillating) {
          behEl.textContent = 'Oscilando';
          behEl.className = 'beh invalid';
        } else {
          behEl.textContent = 'Estável';
          behEl.className = 'beh info';
        }
      }

      // 3. Tabela Verdade
      const tableWrap = $('#tableWrap');
      if (tableWrap) {
        const spec = this.engine.generateTruthTable();
        if (spec && spec.rows.length <= 16) {
          const head = `<tr>${spec.head.map(h => `<th>${h}</th>`).join('')}</tr>`;
          const body = spec.rows.map((row, idx) =>
            `<tr${idx === spec.active ? ' class="active"' : ''}>${row.map(c => `<td>${c}</td>`).join('')}</tr>`
          ).join('');
          tableWrap.innerHTML = `<table class="tt"><thead>${head}</thead><tbody>${body}</tbody></table>`;
        } else {
          tableWrap.innerHTML = '<div class="table-cap">Conecte Chaves e Lâmpadas para gerar a tabela verdade automaticamente.</div>';
        }
      }

      // 4. Notas Educacionais
      const noteEl = $('#note');
      if (noteEl) {
        const p = window.SimPresets.PRESETS[this.currentScene];
        noteEl.innerHTML = (p && p.note) ? p.note : '<b>Circuito Personalizado.</b> Construa e simule qualquer circuito lógico conectando portas e sinais.';
      }
    }

    // ------------------------------------------------ Oscilograma / Linha do Tempo
    drawWave() {
      const canvas = $('#wave');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) return;

      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Obter sinais monitorados
      const sigs = [];
      this.engine.components.forEach(c => {
        const label = c.customLabel || c.id;
        if (!sigs.includes(label)) sigs.push(label);
      });

      if (!sigs.length) return;

      const W = rect.width, H = rect.height;
      const x0 = 36;
      const plotW = Math.max(16, W - x0 - 6);
      const rowH = H / sigs.length;
      const maxSlots = 32;
      const slot = plotW / maxSlots;

      const isLight = document.body.classList.contains('theme-light');
      const waveColors = isLight ? WAVE_COLOR_LIGHT : WAVE_COLOR_DARK;
      const defaultWaveColor = isLight ? '#64748b' : '#94a3b8';

      // Grade temporal
      ctx.lineWidth = 1;
      ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.7)' : 'rgba(51, 65, 85, 0.32)';
      for (let gx = x0; gx <= W - 4; gx += slot * 4) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '600 8px "JetBrains Mono", monospace';

      const n = this.engine.waveHistory.length;

      sigs.forEach((sig, r) => {
        const cy = r * rowH + rowH / 2;
        const amp = Math.min(8, rowH * 0.32);
        const hi = cy - amp;
        const lo = cy + amp;
        const color = waveColors[sig] || defaultWaveColor;

        // Linha de base
        ctx.strokeStyle = isLight ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x0, lo + 2);
        ctx.lineTo(W - 4, lo + 2);
        ctx.stroke();

        // Label
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = color;
        ctx.fillText(sig, 2, cy);
        ctx.globalAlpha = 1;

        if (!n) return;

        const start = x0 + plotW - n * slot;
        let prevY = this.engine.waveHistory[0][sig] ? hi : lo;

        ctx.beginPath();
        ctx.moveTo(start, prevY);
        for (let idx = 0; idx < n; idx++) {
          const xb = start + (idx + 1) * slot;
          ctx.lineTo(xb, prevY);
          const nextVal = this.engine.waveHistory[idx + 1] ? this.engine.waveHistory[idx + 1][sig] : this.engine.waveHistory[idx][sig];
          const nextY = nextVal ? hi : lo;
          if (nextY !== prevY) ctx.lineTo(xb, nextY);
          prevY = nextY;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.stroke();
      });
    }

    // ------------------------------------------------------ Menus e Modais
    updateModals() {
      // Checkboxes do menu de seções
      if ($('#chkSecTopbar')) $('#chkSecTopbar').checked = this.sectionConfig.topbar;
      if ($('#chkSecCircuit')) $('#chkSecCircuit').checked = this.sectionConfig.circuitPanel;
      if ($('#chkSecSide')) $('#chkSecSide').checked = this.sectionConfig.side;
      if ($('#chkSecBottom')) $('#chkSecBottom').checked = this.sectionConfig.bottom;

      // Sliders do menu de redimensionamento
      const sliderSide = $('#sliderSideWidth');
      const sliderBottom = $('#sliderBottomHeight');
      if (sliderSide) sliderSide.value = this.resizeConfig.sideWidth;
      if (sliderBottom) sliderBottom.value = this.resizeConfig.bottomHeight;
    }

    showToast(msg) {
      const old = $('.toast-msg');
      if (old) old.remove();
      const div = document.createElement('div');
      div.className = 'toast-msg';
      div.textContent = msg;
      document.body.appendChild(div);
      setTimeout(() => { if (div.parentNode) div.remove(); }, 2400);
    }

    // ----------------------------------------------------- Event Binding
    initEvents() {
      // 0. Alternar Tema Claro / Escuro
      const btnTheme = $('#btnThemeToggle');
      if (btnTheme) {
        btnTheme.addEventListener('click', () => {
          this.applyTheme(this.theme === 'light' ? 'dark' : 'light');
        });
      }

      // 1. Abas e Preset
      $('#tabs').addEventListener('click', e => {
        const btn = e.target.closest('[data-scene]');
        if (btn) this.loadPreset(btn.dataset.scene);
      });

      const tabsSelect = $('#tabsSelect');
      if (tabsSelect) {
        tabsSelect.addEventListener('change', e => {
          this.loadPreset(e.target.value);
        });
      }

      // 2. Seletor de portas e Modos de Edição no Cabeçalho do Canva
      $('#sceneHead').addEventListener('click', e => {
        const modeBtn = e.target.closest('[data-canvas-mode]');
        if (modeBtn) {
          const m = modeBtn.dataset.canvasMode;
          this.canvas.setMode(m);
          this.renderSceneHead();
          const pal = $('#compPalette');
          const btnOpen = $('#btnOpenPalette');
          if (m === 'view') {
            if (pal) pal.classList.add('is-collapsed');
            if (btnOpen) btnOpen.style.display = 'none';
          } else {
            if (pal) pal.classList.remove('is-collapsed');
            if (btnOpen) btnOpen.style.display = 'none';
          }
          return;
        }

        const gateBtn = e.target.closest('[data-gate]');
        if (gateBtn) {
          this.loadPreset('gates', gateBtn.dataset.gate);
          return;
        }
        if (e.target.closest('#btnFitCanvas')) {
          this.canvas.resetZoom();
          return;
        }
        if (e.target.closest('#btnClearCanvas')) {
          this.engine.reset();
          this.canvas.render();
          this.updatePanels();
          this.drawWave();
          return;
        }
      });

      // 3. Paleta de Componentes (Adicionar ao Canva e Colapsar/Expandir)
      const palette = $('#compPalette');
      if (palette) {
        palette.addEventListener('click', e => {
          const btn = e.target.closest('[data-add-type]');
          if (btn) {
            const type = btn.dataset.addType;
            this.canvas.addNewComponent(type);
            this.updatePanels();
          }
        });
      }

      // 4. Botões de Linha do Tempo e Seletor de Clock
      $('#btnPulse').addEventListener('click', () => {
        this.engine.pulseClock();
      });

      $('#btnAuto').addEventListener('click', () => {
        const isRunning = this.engine.toggleAutoClock(() => {
          this.canvas.render();
          this.updatePanels();
          this.drawWave();
        });
        const btn = $('#btnAuto');
        if (btn) {
          btn.classList.toggle('active', isRunning);
          btn.textContent = isRunning ? 'Parar' : 'Auto';
        }
      });

      const selClock = $('#selectClockType');
      if (selClock) {
        selClock.addEventListener('change', e => {
          this.engine.setGlobalClockType(e.target.value);
          this.canvas.render();
          this.updateClockControls();
        });
      }

      $('#btnReset').addEventListener('click', () => {
        this.engine.components.forEach(c => { c.state = 0; });
        this.engine.evaluate();
        this.engine.recordWave();
        this.canvas.render();
        this.updatePanels();
        this.drawWave();
      });

      // 5. Botões de Ocultar Seções, Editor Unificado de Seções e Toggle da Paleta
      document.addEventListener('click', e => {
        const hideBtn = e.target.closest('[data-hide-sec]');
        if (hideBtn) {
          const sec = hideBtn.dataset.hideSec;
          this.setSectionVisible(sec, false);
          return;
        }

        // Toggle da Paleta Lateral
        if (e.target.closest('#btnTogglePalette')) {
          const pal = $('#compPalette');
          const btnOpen = $('#btnOpenPalette');
          if (pal) pal.classList.add('is-collapsed');
          if (btnOpen) btnOpen.style.display = 'block';
          return;
        }
        if (e.target.closest('#btnOpenPalette')) {
          const pal = $('#compPalette');
          const btnOpen = $('#btnOpenPalette');
          if (pal) pal.classList.remove('is-collapsed');
          if (btnOpen) btnOpen.style.display = 'none';
          return;
        }

        // Toggle do Editor Unificado de Seções (Visibilidade + Dimensões)
        if (e.target.closest('#floatingViewBtn') || e.target.closest('#btnSectionsEditor')) {
          const modal = $('#sectionsEditorModal');
          if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
          return;
        }
        if (e.target.closest('#btnCloseSecEditor')) {
          $('#sectionsEditorModal').style.display = 'none';
          return;
        }
        if (e.target.closest('#btnRestoreAllSec')) {
          this.sectionConfig.topbar = true;
          this.sectionConfig.circuitPanel = true;
          this.sectionConfig.side = true;
          this.sectionConfig.bottom = true;
          this.applyLayout();
          $('#sectionsEditorModal').style.display = 'none';
          this.showToast('Todas as seções foram restauradas!');
          return;
        }
      });

      // 6. Checkboxes do menu de visibilidade
      ['topbar', 'circuitPanel', 'side', 'bottom'].forEach(sec => {
        const chk = $(`#chkSec${sec === 'circuitPanel' ? 'Circuit' : sec[0].toUpperCase() + sec.slice(1)}`);
        if (chk) {
          chk.addEventListener('change', () => {
            this.setSectionVisible(sec, chk.checked);
          });
        }
      });

      // 7. Ações de Redimensionamento no Modal
      document.addEventListener('click', e => {
        const presetBtn = e.target.closest('[data-resize-preset]');
        if (presetBtn) {
          const p = presetBtn.dataset.resizePreset;
          if (p === 'default') {
            this.resizeConfig.sideWidth = 318;
            this.resizeConfig.bottomHeight = 128;
          } else if (p === 'expandCircuit') {
            this.resizeConfig.sideWidth = 220;
            this.resizeConfig.bottomHeight = 80;
          } else if (p === 'expandSide') {
            this.resizeConfig.sideWidth = 440;
            this.resizeConfig.bottomHeight = 110;
          } else if (p === 'expandBottom') {
            this.resizeConfig.sideWidth = 280;
            this.resizeConfig.bottomHeight = 220;
          }
          this.saveLayout();
          this.applyLayout();
          this.showToast('Tamanho ajustado!');
        }
      });

      // 8. Sliders de Tamanho
      const sliderSide = $('#sliderSideWidth');
      if (sliderSide) {
        sliderSide.addEventListener('input', () => {
          this.resizeConfig.sideWidth = parseInt(sliderSide.value, 10);
          this.applyLayout();
          this.saveLayout();
        });
      }
      const sliderBottom = $('#sliderBottomHeight');
      if (sliderBottom) {
        sliderBottom.addEventListener('input', () => {
          this.resizeConfig.bottomHeight = parseInt(sliderBottom.value, 10);
          this.applyLayout();
          this.saveLayout();
        });
      }

      // 9. Atualização contínua de simulação
      window.addEventListener('sim-updated', () => {
        this.updatePanels();
        this.drawWave();
      });

      // 10. Redimensionamento de Janela e Topbar Responsivo
      const checkTopbarCompact = () => {
        const card = $('#simCard');
        if (!card) return;
        const isCompact = card.clientWidth < 860;
        card.classList.toggle('is-compact-topbar', isCompact);
      };

      if (window.ResizeObserver) {
        new ResizeObserver(() => this.drawWave()).observe($('#secBottom'));
        if ($('#simCard')) {
          new ResizeObserver(checkTopbarCompact).observe($('#simCard'));
        }
      }
      window.addEventListener('resize', () => {
        this.drawWave();
        checkTopbarCompact();
      });
      setTimeout(checkTopbarCompact, 50);
    }
  }

  return {
    SimulatorUI
  };
})();
