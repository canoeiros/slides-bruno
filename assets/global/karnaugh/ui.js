/**
 * ============================================================================
 * KARNAUGH MAP - INTERFACE & RENDERIZADOR VISUAL
 * Gerencia o estado, interação com células, renderização SVG dos laços,
 * sincronização da tabela verdade, modo didático e parâmetros de URL.
 * ============================================================================
 */

window.KarnaughUI = (function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  class KarnaughApp {
    constructor() {
      // Estado Principal
      this.numVars = 4;
      this.varNames = ['A', 'B', 'C', 'D'];
      this.type = 'SOP'; // 'SOP' ou 'POS'
      this.mode = 'auto'; // 'auto' (solver) ou 'manual' (prática)
      this.theme = 'dark';
      this.readOnly = false;
      this.activeTab = 'groups'; // 'groups', 'truthTable', 'rules'

      this.values = []; // Array de '0', '1', 'X'
      this.manualSelected = new Set();
      this.hoveredGroupId = null;

      // Seções visíveis
      this.visible = {
        topbar: true,
        exprCard: true,
        sidePanel: true,
        actionsBar: true
      };

      this.initFromURL();
      this.initDOM();
      this.bindEvents();
      this.applyTheme(this.theme);
      this.render();
    }

    /**
     * Lê parâmetros da URL para incorporação em slides Quarto
     * Exemplos:
     * ?vars=3&m=1,3,4,5,6
     * ?preset=four_corners&theme=light&hide=side
     * ?readonly=1&only=map
     */
    initFromURL() {
      const params = new URLSearchParams(window.location.search);

      // Tema
      if (params.has('theme')) {
        const t = params.get('theme').toLowerCase();
        if (t === 'light' || t === 'dark') this.theme = t;
      }

      // Número de variáveis (2, 3 ou 4)
      if (params.has('vars') || params.has('n')) {
        const n = parseInt(params.get('vars') || params.get('n'), 10);
        if ([2, 3, 4].includes(n)) {
          this.numVars = n;
        }
      }

      // Nomes de variáveis customizados (?names=W,X,Y,Z)
      if (params.has('names')) {
        const custom = params.get('names').split(',').map(s => s.trim().toUpperCase());
        if (custom.length >= this.numVars) {
          this.varNames = custom.slice(0, this.numVars);
        }
      } else {
        this.varNames = ['A', 'B', 'C', 'D'].slice(0, this.numVars);
      }

      // Tipo: SOP ou POS
      if (params.has('type')) {
        const tp = params.get('type').toUpperCase();
        if (tp === 'SOP' || tp === 'POS') this.type = tp;
      }

      // Modo: auto ou manual
      if (params.has('mode')) {
        const md = params.get('mode').toLowerCase();
        if (md === 'auto' || md === 'manual') this.mode = md;
      }

      // Somente Leitura (?readonly=1)
      if (params.get('readonly') === '1' || params.get('readonly') === 'true') {
        this.readOnly = true;
      }

      // Ocultar seções para embeds limpos
      if (params.get('only') === 'map' || params.get('embed') === '1') {
        this.visible.sidePanel = false;
        document.body.classList.add('embed-mode');
      }

      if (params.has('hide')) {
        const list = params.get('hide').split(',').map(s => s.trim().toLowerCase());
        if (list.includes('side') || list.includes('panels') || list.includes('panel')) {
          this.visible.sidePanel = false;
        }
        if (list.includes('topbar') || list.includes('header')) {
          this.visible.topbar = false;
        }
        if (list.includes('actions') || list.includes('toolbar')) {
          this.visible.actionsBar = false;
        }
        if (list.includes('expr') || list.includes('formula')) {
          this.visible.exprCard = false;
        }
      }

      // Inicializa os valores das células
      const totalCells = 1 << this.numVars;
      this.values = new Array(totalCells).fill('0');

      // Verifica se há preset
      const presetId = params.get('preset');
      if (presetId && window.KarnaughPresets) {
        const preset = window.KarnaughPresets.getPresetById(presetId);
        if (preset) {
          this.loadPreset(preset, false);
          return;
        }
      }

      // Mintermos manuais pela URL (?m=0,2,8,10)
      if (params.has('m') || params.has('minterms')) {
        const mStr = params.get('m') || params.get('minterms');
        const list = mStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        for (const m of list) {
          if (m >= 0 && m < totalCells) {
            this.values[m] = '1';
          }
        }
      }

      // Don't Cares pela URL (?d=1,3)
      if (params.has('d') || params.has('dontcare') || params.has('dc')) {
        const dStr = params.get('d') || params.get('dontcare') || params.get('dc');
        const list = dStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        for (const m of list) {
          if (m >= 0 && m < totalCells) {
            this.values[m] = 'X';
          }
        }
      }

      // Se nenhum mintermo foi passado e é 4 vars padrão, inicia com preset 4 cantos
      if (!params.has('m') && !params.has('minterms') && !presetId) {
        if (this.numVars === 4) {
          this.loadPresetById('four_corners', false);
        } else if (this.numVars === 3) {
          this.loadPresetById('aula6_ex1', false);
        } else {
          this.loadPresetById('xor_2var', false);
        }
      }
    }

    /**
     * Localiza os elementos principais no DOM
     */
    initDOM() {
      this.dom = {
        card: $('#kCard'),
        topbar: $('#kTopbar'),
        brandTitle: $('#kBrandTitle'),
        varBtns: $$('.k-var-btn'),
        presetSelect: $('#presetSelect'),
        btnTheme: $('#btnThemeToggle'),
        btnMode: $('#btnModeToggle'),
        btnType: $('#btnTypeToggle'),
        btnSideToggle: $('#btnSideToggle'),

        mapPanel: $('#mapPanel'),
        exprCard: $('#exprCard'),
        exprFormula: $('#exprFormula'),
        exprBadges: $('#exprBadges'),

        gridContainer: $('#gridContainer'),
        matrixWrap: $('#matrixWrap'),
        cellsGrid: $('#cellsGrid'),
        svgOverlay: $('#svgOverlay'),

        actionsBar: $('#actionsBar'),
        btnClear: $('#btnClear'),
        btnFill: $('#btnFill'),
        btnInvert: $('#btnInvert'),
        btnRandom: $('#btnRandom'),
        btnPromptM: $('#btnPromptM'),
        btnCopyLatex: $('#btnCopyLatex'),
        btnCopyIframe: $('#btnCopyIframe'),

        sidePanel: $('#sidePanel'),
        sideTabs: $$('.k-side-tab'),
        tabGroups: $('#tabGroups'),
        tabTruthTable: $('#tabTruthTable'),
        tabRules: $('#tabRules'),
        groupsList: $('#groupsList'),
        truthTableWrap: $('#truthTableWrap'),
        manualBanner: $('#manualBanner'),
        manualStatus: $('#manualStatus')
      };

      // Aplica visibilidade inicial
      if (!this.visible.topbar && this.dom.topbar) this.dom.topbar.style.display = 'none';
      if (!this.visible.exprCard && this.dom.exprCard) this.dom.exprCard.style.display = 'none';
      if (!this.visible.actionsBar && this.dom.actionsBar) this.dom.actionsBar.style.display = 'none';
      if (!this.visible.sidePanel && this.dom.sidePanel) this.dom.sidePanel.style.display = 'none';

      // Preenche o seletor de presets
      this.populatePresetsSelect();
    }

    /**
     * Vincula ouvintes de eventos
     */
    bindEvents() {
      // Alternância de Tema
      if (this.dom.btnTheme) {
        this.dom.btnTheme.addEventListener('click', () => {
          this.theme = (this.theme === 'dark') ? 'light' : 'dark';
          this.applyTheme(this.theme);
        });
      }

      // Seleção de número de variáveis
      this.dom.varBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const v = parseInt(btn.dataset.vars, 10);
          if (v && v !== this.numVars) {
            this.setNumVars(v);
          }
        });
      });

      // Seletor de Presets
      if (this.dom.presetSelect) {
        this.dom.presetSelect.addEventListener('change', (e) => {
          const val = e.target.value;
          if (val) this.loadPresetById(val);
        });
      }

      // Alternância SOP / POS
      if (this.dom.btnType) {
        this.dom.btnType.addEventListener('click', () => {
          this.type = (this.type === 'SOP') ? 'POS' : 'SOP';
          this.dom.btnType.textContent = (this.type === 'SOP') ? 'Σ SOP' : 'Π POS';
          this.render();
        });
      }

      // Alternância de Modo (Automático / Prática)
      if (this.dom.btnMode) {
        this.dom.btnMode.addEventListener('click', () => {
          this.mode = (this.mode === 'auto') ? 'manual' : 'auto';
          this.dom.btnMode.textContent = (this.mode === 'auto') ? '🤖 Auto' : '✏️ Prática';
          this.dom.btnMode.classList.toggle('k-btn-primary', this.mode === 'manual');
          this.manualSelected.clear();
          this.render();
        });
      }

      // Ocultar / Mostrar Barra Lateral
      if (this.dom.btnSideToggle) {
        this.dom.btnSideToggle.addEventListener('click', () => {
          const isHidden = (this.dom.sidePanel.style.display === 'none');
          this.dom.sidePanel.style.display = isHidden ? 'flex' : 'none';
          this.dom.btnSideToggle.textContent = isHidden ? '◀ Painel' : '▶ Painel';
          this.updateOverlayPositions();
        });
      }

      // Abas da Barra Lateral
      this.dom.sideTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.tab;
          this.setSideTab(target);
        });
      });

      // Botões de Ação Rápida
      if (this.dom.btnClear) this.dom.btnClear.addEventListener('click', () => this.clearMap());
      if (this.dom.btnFill) this.dom.btnFill.addEventListener('click', () => this.fillMap());
      if (this.dom.btnInvert) this.dom.btnInvert.addEventListener('click', () => this.invertMap());
      if (this.dom.btnRandom) this.dom.btnRandom.addEventListener('click', () => this.randomMap());
      if (this.dom.btnPromptM) this.dom.btnPromptM.addEventListener('click', () => this.promptMinterms());
      if (this.dom.btnCopyLatex) this.dom.btnCopyLatex.addEventListener('click', () => this.copyLatex());
      if (this.dom.btnCopyIframe) this.dom.btnCopyIframe.addEventListener('click', () => this.copyIframe());

      // Redimensionamento de janela atualiza os enlaçamentos SVG
      window.addEventListener('resize', () => {
        this.updateOverlayPositions();
      });
    }

    /**
     * Aplica o tema visual no documento
     */
    applyTheme(theme) {
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(`theme-${theme}`);
      if (this.dom.btnTheme) {
        this.dom.btnTheme.textContent = (theme === 'dark') ? '🌙 Escuro' : '☀️ Claro';
      }
    }

    /**
     * Preenche as opções de exemplos pré-configurados
     */
    populatePresetsSelect() {
      if (!this.dom.presetSelect || !window.KarnaughPresets) return;
      const presets = window.KarnaughPresets.PRESETS;

      this.dom.presetSelect.innerHTML = '<option value="">-- Carregar Exemplo --</option>';

      // Agrupa por categoria
      const categories = {};
      presets.forEach(p => {
        if (!categories[p.category]) categories[p.category] = [];
        categories[p.category].push(p);
      });

      for (const [cat, list] of Object.entries(categories)) {
        const group = document.createElement('optgroup');
        group.label = cat;
        list.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          group.appendChild(opt);
        });
        this.dom.presetSelect.appendChild(group);
      }
    }

    /**
     * Carrega um preset por ID
     */
    loadPresetById(id, doRender = true) {
      if (!window.KarnaughPresets) return;
      const p = window.KarnaughPresets.getPresetById(id);
      if (p) this.loadPreset(p, doRender);
    }

    /**
     * Carrega objeto de preset
     */
    loadPreset(preset, doRender = true) {
      this.numVars = preset.numVars;
      this.varNames = preset.varNames || ['A', 'B', 'C', 'D'].slice(0, this.numVars);
      const total = 1 << this.numVars;
      this.values = new Array(total).fill('0');

      for (const m of preset.minterms) {
        if (m < total) this.values[m] = '1';
      }
      for (const d of (preset.dontCares || [])) {
        if (d < total) this.values[d] = 'X';
      }

      if (this.dom.presetSelect) {
        this.dom.presetSelect.value = preset.id;
      }

      this.manualSelected.clear();
      if (doRender) this.render();
    }

    /**
     * Altera o número de variáveis ativas
     */
    setNumVars(n) {
      this.numVars = n;
      this.varNames = ['A', 'B', 'C', 'D'].slice(0, n);
      const total = 1 << n;
      this.values = new Array(total).fill('0');
      this.manualSelected.clear();

      // Carrega um preset adequado para o novo número de variáveis
      if (n === 2) this.loadPresetById('xor_2var', false);
      else if (n === 3) this.loadPresetById('aula6_ex1', false);
      else this.loadPresetById('four_corners', false);

      this.render();
    }

    /**
     * Alterna a aba do painel lateral
     */
    setSideTab(tabName) {
      this.activeTab = tabName;
      this.dom.sideTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
      });

      this.dom.tabGroups.style.display = (tabName === 'groups') ? 'block' : 'none';
      this.dom.tabTruthTable.style.display = (tabName === 'truthTable') ? 'block' : 'none';
      this.dom.tabRules.style.display = (tabName === 'rules') ? 'block' : 'none';
    }

    /**
     * Cicla o valor da célula: 0 -> 1 -> X -> 0
     */
    cycleCellValue(mintermIndex, reverse = false) {
      if (this.readOnly) return;
      const current = this.values[mintermIndex] || '0';
      let next = '1';

      if (!reverse) {
        if (current === '0') next = '1';
        else if (current === '1') next = 'X';
        else next = '0';
      } else {
        if (current === '0') next = 'X';
        else if (current === 'X') next = '1';
        else next = '0';
      }

      this.values[mintermIndex] = next;
      this.render();
    }

    /**
     * Alterna a seleção manual no Modo Prática
     */
    toggleManualSelect(mintermIndex) {
      if (this.manualSelected.has(mintermIndex)) {
        this.manualSelected.delete(mintermIndex);
      } else {
        this.manualSelected.add(mintermIndex);
      }
      this.render();
    }

    /**
     * Limpa o mapa (todos os valores viram 0)
     */
    clearMap() {
      this.values.fill('0');
      this.manualSelected.clear();
      this.render();
    }

    /**
     * Preenche o mapa com 1s
     */
    fillMap() {
      this.values.fill('1');
      this.manualSelected.clear();
      this.render();
    }

    /**
     * Inverte os valores: 0 vira 1, 1 vira 0 (X permanece X)
     */
    invertMap() {
      this.values = this.values.map(v => (v === '1' ? '0' : (v === '0' ? '1' : 'X')));
      this.render();
    }

    /**
     * Gera uma configuração aleatória interessante
     */
    randomMap() {
      const total = 1 << this.numVars;
      this.values = Array.from({ length: total }, () => {
        const r = Math.random();
        if (r < 0.45) return '1';
        if (r < 0.85) return '0';
        return 'X';
      });
      this.render();
    }

    /**
     * Solicita lista de mintermos por prompt
     */
    promptMinterms() {
      const input = prompt(
        'Digite os mintermos separados por vírgula (ex: 0, 2, 8, 10):\nAdicione "d:" para don\'t cares (ex: 0, 2, 8, 10 d: 1, 3)',
        ''
      );
      if (!input) return;

      const total = 1 << this.numVars;
      this.values.fill('0');

      let onesPart = input;
      let dcPart = '';

      if (input.includes('d:')) {
        const parts = input.split('d:');
        onesPart = parts[0];
        dcPart = parts[1];
      }

      const ones = onesPart.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      for (const m of ones) {
        if (m >= 0 && m < total) this.values[m] = '1';
      }

      if (dcPart) {
        const dcs = dcPart.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        for (const m of dcs) {
          if (m >= 0 && m < total) this.values[m] = 'X';
        }
      }

      this.render();
    }

    /**
     * Copia a fórmula LaTeX para a área de transferência
     */
    copyLatex() {
      if (!this.lastSolution) return;
      const latex = this.lastSolution.expression.latex;
      navigator.clipboard.writeText(latex).then(() => {
        this.flashButton(this.dom.btnCopyLatex, '✓ Copiado!');
      }).catch(() => {
        prompt('Copie o código LaTeX:', latex);
      });
    }

    /**
     * Copia o código de iframe para incorporação em slides RevealJS / Quarto
     */
    copyIframe() {
      const activeMinterms = [];
      const activeDCs = [];
      this.values.forEach((v, idx) => {
        if (v === '1') activeMinterms.push(idx);
        else if (v === 'X') activeDCs.push(idx);
      });

      let src = `../assets/global/karnaugh.html?vars=${this.numVars}`;
      if (activeMinterms.length > 0) src += `&m=${activeMinterms.join(',')}`;
      if (activeDCs.length > 0) src += `&d=${activeDCs.join(',')}`;
      if (this.type !== 'SOP') src += `&type=${this.type.toLowerCase()}`;
      if (this.theme !== 'dark') src += `&theme=${this.theme}`;

      const iframeHtml = `<iframe src="${src}&hide=panels" width="100%" height="480px" style="border: none; border-radius: 12px;"></iframe>`;

      navigator.clipboard.writeText(iframeHtml).then(() => {
        this.flashButton(this.dom.btnCopyIframe, '✓ Copiado!');
      }).catch(() => {
        prompt('Copie o código do iframe:', iframeHtml);
      });
    }

    flashButton(btn, text) {
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = text;
      setTimeout(() => {
        btn.textContent = orig;
      }, 1500);
    }

    /**
     * RENDERIZAÇÃO COMPLETA
     */
    render() {
      // 1. Atualiza botões do cabeçalho
      this.dom.varBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.vars, 10) === this.numVars);
      });

      // 2. Executa o algoritmo de resolução
      const solution = window.KarnaughSolver.solve({
        numVars: this.numVars,
        varNames: this.varNames,
        values: this.values,
        type: this.type
      });
      this.lastSolution = solution;

      // 3. Renderiza a barra da expressão simplificada
      this.renderExpression(solution);

      // 4. Renderiza a matriz e as células do mapa
      this.renderGrid(solution.config);

      // 5. Renderiza a camada SVG dos enlaçamentos
      if (this.mode === 'auto') {
        if (this.dom.manualBanner) this.dom.manualBanner.style.display = 'none';
        this.renderGroupLoops(solution.groups, solution.config);
      } else {
        if (this.dom.manualBanner) this.dom.manualBanner.style.display = 'flex';
        this.renderManualMode(solution.config);
      }

      // 6. Renderiza o conteúdo do painel lateral
      this.renderSidePanel(solution);
    }

    /**
     * Renderiza a expressão booleana e os badges
     */
    renderExpression(solution) {
      if (!this.dom.exprFormula) return;

      this.dom.exprFormula.innerHTML = solution.expression.html;

      // Eventos de hover nos termos da expressão
      const terms = $$('.expr-term', this.dom.exprFormula);
      terms.forEach(termEl => {
        const gid = termEl.dataset.groupId;
        termEl.addEventListener('mouseenter', () => this.highlightGroup(gid));
        termEl.addEventListener('mouseleave', () => this.highlightGroup(null));
      });

      // Badges com mintermos numéricos
      if (this.dom.exprBadges) {
        const { ones, dontCares } = solution.minterms;
        let badgesHtml = '';

        if (this.type === 'SOP') {
          if (ones.length > 0) {
            badgesHtml += `<span class="k-badge">Σ m(${ones.join(', ')})</span>`;
          }
        } else {
          const { zeros } = solution.minterms;
          if (zeros.length > 0) {
            badgesHtml += `<span class="k-badge">Π M(${zeros.join(', ')})</span>`;
          }
        }

        if (dontCares.length > 0) {
          badgesHtml += `<span class="k-badge">+ d(${dontCares.join(', ')})</span>`;
        }

        badgesHtml += `<span class="k-badge">${solution.groups.length} grupo(s)</span>`;

        this.dom.exprBadges.innerHTML = badgesHtml;
      }
    }

    /**
     * Renderiza a estrutura da matriz (Cabeçalhos Gray + Células)
     */
    renderGrid(config) {
      const numRows = config.rows;
      const numCols = config.cols;

      // Define o grid CSS da matriz (1 coluna extra para rótulo da linha, 1 linha extra para rótulo da coluna)
      const matrix = this.dom.matrixWrap;
      matrix.style.gridTemplateColumns = `auto repeat(${numCols}, auto)`;
      matrix.style.gridTemplateRows = `auto repeat(${numRows}, auto)`;
      matrix.innerHTML = '';

      // Célula do canto (diagonal com variáveis)
      const corner = document.createElement('div');
      corner.className = 'k-corner-label';
      corner.innerHTML = `
        <span class="k-corner-row-var">${config.rowVars.join('')}</span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.4" />
        </svg>
        <span class="k-corner-col-var">${config.colVars.join('')}</span>
      `;
      corner.style.gridRow = '1';
      corner.style.gridColumn = '1';
      matrix.appendChild(corner);

      // Cabeçalhos das Colunas (Códigos de Gray das colunas)
      for (let c = 0; c < numCols; c++) {
        const colHeader = document.createElement('div');
        colHeader.className = 'k-col-header';
        colHeader.textContent = config.colGray[c];
        colHeader.style.gridRow = '1';
        colHeader.style.gridColumn = String(c + 2);
        matrix.appendChild(colHeader);
      }

      // Cabeçalhos das Linhas (Códigos de Gray das linhas)
      for (let r = 0; r < numRows; r++) {
        const rowHeader = document.createElement('div');
        rowHeader.className = 'k-row-header';
        rowHeader.textContent = config.rowGray[r];
        rowHeader.style.gridRow = String(r + 2);
        rowHeader.style.gridColumn = '1';
        matrix.appendChild(rowHeader);
      }

      // Container das células
      const cellsContainer = document.createElement('div');
      cellsContainer.className = 'k-cells-grid';
      cellsContainer.id = 'cellsGrid';
      cellsContainer.style.gridRow = `2 / span ${numRows}`;
      cellsContainer.style.gridColumn = `2 / span ${numCols}`;
      cellsContainer.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
      cellsContainer.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;

      // Camada SVG para os laços
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'k-svg-overlay');
      svg.setAttribute('id', 'svgOverlay');
      cellsContainer.appendChild(svg);
      this.dom.svgOverlay = svg;

      // Cria cada uma das células
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const m = window.KarnaughSolver.coordsToMinterm(r, c, config);
          const val = this.values[m] || '0';
          const binStr = window.KarnaughSolver.toBinaryString(m, config.numVars);

          const cell = document.createElement('div');
          cell.className = 'k-cell';
          cell.dataset.minterm = String(m);
          cell.dataset.r = String(r);
          cell.dataset.c = String(c);
          cell.dataset.val = val;

          if (this.mode === 'manual' && this.manualSelected.has(m)) {
            cell.classList.add('is-manual-selected');
          }

          cell.innerHTML = `
            <span class="k-cell-m">m${m}</span>
            <span class="k-cell-val">${val}</span>
            <span class="k-cell-bin">${binStr}</span>
          `;

          // Evento de clique
          cell.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.mode === 'auto') {
              this.cycleCellValue(m, false);
            } else {
              this.toggleManualSelect(m);
            }
          });

          // Evento de clique com botão direito
          cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.mode === 'auto') {
              this.cycleCellValue(m, true);
            }
          });

          // Evento de hover para destacar linha correspondente na tabela verdade
          cell.addEventListener('mouseenter', () => {
            this.highlightTruthTableRow(m, true);
          });
          cell.addEventListener('mouseleave', () => {
            this.highlightTruthTableRow(m, false);
          });

          cellsContainer.appendChild(cell);
        }
      }

      matrix.appendChild(cellsContainer);
      this.dom.cellsGrid = cellsContainer;
    }

    /**
     * Renderiza os enlaçamentos gráficos dos grupos no SVG
     */
    renderGroupLoops(groups, config) {
      if (!this.dom.svgOverlay || !this.dom.cellsGrid) return;
      const svg = this.dom.svgOverlay;
      svg.innerHTML = '';

      if (!groups || groups.length === 0) return;

      // Aguarda o próximo frame para medir dimensões exatas das células
      requestAnimationFrame(() => {
        this.drawSvgLoops(groups, config);
      });
    }

    /**
     * Desenha os polígonos/retângulos arredondados no SVG
     */
    drawSvgLoops(groups, config) {
      const svg = this.dom.svgOverlay;
      if (!svg) return;
      svg.innerHTML = '';

      const gridRect = this.dom.cellsGrid.getBoundingClientRect();
      const cells = $$('.k-cell', this.dom.cellsGrid);
      const cellMap = new Map();

      cells.forEach(el => {
        const m = parseInt(el.dataset.minterm, 10);
        const rect = el.getBoundingClientRect();
        // Coordenadas relativas ao container das células
        cellMap.set(m, {
          x: rect.left - gridRect.left,
          y: rect.top - gridRect.top,
          width: rect.width,
          height: rect.height
        });
      });

      const pad = 4; // Espaçamento interno do retângulo de enlaçamento

      groups.forEach((group, gIdx) => {
        const geom = group.geometry;
        const color = group.color;

        geom.boxes.forEach((box, bIdx) => {
          // Obtém coordenadas das células extremas da caixa
          const mTopLeft = window.KarnaughSolver.coordsToMinterm(box.r1, box.c1, config);
          const mBottomRight = window.KarnaughSolver.coordsToMinterm(box.r2, box.c2, config);

          const rTL = cellMap.get(mTopLeft);
          const rBR = cellMap.get(mBottomRight);

          if (!rTL || !rBR) return;

          const x = rTL.x + pad;
          const y = rTL.y + pad;
          const w = (rBR.x + rBR.width - pad) - x;
          const h = (rBR.y + rBR.height - pad) - y;

          // Se for wrap-around, desenha curvas indicativas nas bordas
          if (box.wrap && box.wrap !== 'none') {
            this.drawWrapBox(svg, group.id, x, y, w, h, box.wrap, color, gridRect.width, gridRect.height);
          } else {
            // Retângulo contíguo normal
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'k-loop-path');
            rect.setAttribute('data-group-id', group.id);
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(y));
            rect.setAttribute('width', String(Math.max(0, w)));
            rect.setAttribute('height', String(Math.max(0, h)));
            rect.setAttribute('rx', '12');
            rect.setAttribute('ry', '12');
            rect.style.setProperty('--group-fill', color.fill);
            rect.style.setProperty('--group-stroke', color.stroke);

            // Interação
            rect.addEventListener('mouseenter', () => this.highlightGroup(group.id));
            rect.addEventListener('mouseleave', () => this.highlightGroup(null));

            svg.appendChild(rect);
          }
        });
      });
    }

    /**
     * Desenha caixas de wrap-around com arcos abertos nas bordas
     */
    drawWrapBox(svg, groupId, x, y, w, h, wrapType, color, fullW, fullH) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'k-loop-path');
      path.setAttribute('data-group-id', groupId);
      path.style.setProperty('--group-fill', color.fill);
      path.style.setProperty('--group-stroke', color.stroke);

      const r = 12; // Raio das pontas arredondadas
      let d = '';

      if (wrapType === 'col-left') {
        // Enlaçamento no lado esquerdo do mapa (abre para a esquerda)
        d = `
          M ${x},${y}
          L ${x + w - r},${y}
          A ${r},${r} 0 0 1 ${x + w},${y + r}
          L ${x + w},${y + h - r}
          A ${r},${r} 0 0 1 ${x + w - r},${y + h}
          L ${x},${y + h}
          Z
        `;
      } else if (wrapType === 'col-right') {
        // Enlaçamento no lado direito do mapa (abre para a direita)
        d = `
          M ${x + w},${y}
          L ${x + r},${y}
          A ${r},${r} 0 0 0 ${x},${y + r}
          L ${x},${y + h - r}
          A ${r},${r} 0 0 0 ${x + r},${y + h}
          L ${x + w},${y + h}
          Z
        `;
      } else if (wrapType === 'row-top') {
        // Enlaçamento no topo do mapa (abre para cima)
        d = `
          M ${x},${y}
          L ${x},${y + h - r}
          A ${r},${r} 0 0 0 ${x + r},${y + h}
          L ${x + w - r},${y + h}
          A ${r},${r} 0 0 0 ${x + w},${y + h - r}
          L ${x + w},${y}
          Z
        `;
      } else if (wrapType === 'row-bottom') {
        // Enlaçamento na base do mapa (abre para baixo)
        d = `
          M ${x},${y + h}
          L ${x},${y + r}
          A ${r},${r} 0 0 1 ${x + r},${y}
          L ${x + w - r},${y}
          A ${r},${r} 0 0 1 ${x + w},${y + r}
          L ${x + w},${y + h}
          Z
        `;
      } else if (wrapType === 'corner-tl') {
        // Canto superior-esquerdo: curva no canto interno (inferior-direito)
        d = `
          M ${x},${y}
          L ${x + w},${y}
          L ${x + w},${y + h - r}
          A ${r},${r} 0 0 1 ${x + w - r},${y + h}
          L ${x},${y + h}
          Z
        `;
      } else if (wrapType === 'corner-tr') {
        // Canto superior-direito: curva no canto interno (inferior-esquerdo)
        d = `
          M ${x},${y}
          L ${x + w},${y}
          L ${x + w},${y + h}
          L ${x + r},${y + h}
          A ${r},${r} 0 0 1 ${x},${y + h - r}
          Z
        `;
      } else if (wrapType === 'corner-bl') {
        // Canto inferior-esquerdo: curva no canto interno (superior-direito)
        d = `
          M ${x},${y}
          L ${x + w - r},${y}
          A ${r},${r} 0 0 1 ${x + w},${y + r}
          L ${x + w},${y + h}
          L ${x},${y + h}
          Z
        `;
      } else if (wrapType === 'corner-br') {
        // Canto inferior-direito: curva no canto interno (superior-esquerdo)
        d = `
          M ${x + r},${y}
          L ${x + w},${y}
          L ${x + w},${y + h}
          L ${x},${y + h}
          L ${x},${y + r}
          A ${r},${r} 0 0 1 ${x + r},${y}
          Z
        `;
      } else {
        // Fallback
        d = `
          M ${x},${y}
          h ${w}
          v ${h}
          h ${-w}
          Z
        `;
      }

      path.setAttribute('d', d.replace(/\s+/g, ' ').trim());

      path.addEventListener('mouseenter', () => this.highlightGroup(groupId));
      path.addEventListener('mouseleave', () => this.highlightGroup(null));

      svg.appendChild(path);
    }

    /**
     * Renderização no Modo Didático / Manual
     */
    renderManualMode(config) {
      const selected = Array.from(this.manualSelected);
      const validation = window.KarnaughSolver.validateManualGroup(
        selected,
        config,
        this.values,
        this.type
      );

      if (this.dom.manualStatus) {
        if (selected.length === 0) {
          this.dom.manualStatus.textContent = 'Clique nas células para selecionar e testar um agrupamento.';
          this.dom.manualStatus.className = 'k-manual-status';
        } else if (validation.valid) {
          this.dom.manualStatus.textContent = `✓ ${validation.message}`;
          this.dom.manualStatus.className = 'k-manual-status valid';
        } else {
          this.dom.manualStatus.textContent = `✕ ${validation.message}`;
          this.dom.manualStatus.className = 'k-manual-status invalid';
        }
      }

      // Se for válido, desenha o grupo manual no SVG
      if (validation.valid) {
        const dummyGroup = [{
          id: 'manual',
          geometry: validation.geometry,
          color: {
            fill: 'rgba(139, 92, 246, 0.28)',
            stroke: '#8b5cf6'
          }
        }];
        this.drawSvgLoops(dummyGroup, config);
      } else {
        if (this.dom.svgOverlay) this.dom.svgOverlay.innerHTML = '';
      }
    }

    /**
     * Renderiza o conteúdo das abas do painel lateral
     */
    renderSidePanel(solution) {
      if (!this.dom.sidePanel || this.dom.sidePanel.style.display === 'none') return;

      // 1. Aba Implicantes / Grupos
      if (this.dom.groupsList) {
        if (solution.groups.length === 0) {
          this.dom.groupsList.innerHTML = `
            <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 20px 0;">
              Nenhum grupo ativo.<br>Expressão constante: <strong>${solution.isConstant ? solution.constantVal : '0'}</strong>
            </div>
          `;
        } else {
          let listHtml = '';
          solution.groups.forEach((g) => {
            const mintermsStr = g.minterms.map(m => `m${m}`).join(', ');
            const constVars = g.term.constants.map(c => `${c.var}=${c.val}`).join(' e ');
            const elimVars = g.term.eliminated.length > 0 ? g.term.eliminated.join(', ') : 'nenhuma';
            const essBadge = g.isEssential ? '<span class="k-group-tag">Essencial</span>' : '<span class="k-group-tag">Mínimo</span>';

            listHtml += `
              <div class="k-group-card" data-group-id="${g.id}" style="--group-color: ${g.color.border}">
                <div class="k-group-card-head">
                  <span class="k-group-term">${g.term.html}</span>
                  ${essBadge}
                </div>
                <div class="k-group-details">
                  <div><strong>Células:</strong> <span class="k-group-cells">${mintermsStr}</span> (${g.size} células)</div>
                  <div><strong>Padrão:</strong> <code>${g.implicant}</code></div>
                  <div style="margin-top: 4px; color: var(--text-faint);">
                    Fixos: ${constVars || 'todos'}. Eliminados: ${elimVars}.
                  </div>
                </div>
              </div>
            `;
          });

          this.dom.groupsList.innerHTML = listHtml;

          // Eventos de hover nos cards
          $$('.k-group-card', this.dom.groupsList).forEach(card => {
            const gid = card.dataset.groupId;
            card.addEventListener('mouseenter', () => this.highlightGroup(gid));
            card.addEventListener('mouseleave', () => this.highlightGroup(null));
          });
        }
      }

      // 2. Aba Tabela Verdade Sincronizada
      if (this.dom.truthTableWrap) {
        const config = solution.config;
        const total = 1 << config.numVars;

        let tableHtml = `
          <table class="k-truth-table">
            <thead>
              <tr>
                <th>m</th>
                ${config.varNames.map(v => `<th>${v}</th>`).join('')}
                <th>F</th>
              </tr>
            </thead>
            <tbody>
        `;

        for (let m = 0; m < total; m++) {
          const bin = window.KarnaughSolver.toBinaryString(m, config.numVars);
          const bits = bin.split('');
          const val = this.values[m] || '0';

          tableHtml += `
            <tr data-minterm="${m}">
              <td style="color: var(--text-faint); font-weight: 700;">${m}</td>
              ${bits.map(b => `<td>${b}</td>`).join('')}
              <td class="col-out" data-val="${val}">${val}</td>
            </tr>
          `;
        }

        tableHtml += '</tbody></table>';
        this.dom.truthTableWrap.innerHTML = tableHtml;

        // Eventos na Tabela Verdade
        $$('.k-truth-table tbody tr', this.dom.truthTableWrap).forEach(tr => {
          const m = parseInt(tr.dataset.minterm, 10);
          tr.addEventListener('mouseenter', () => this.highlightMapCell(m, true));
          tr.addEventListener('mouseleave', () => this.highlightMapCell(m, false));
          tr.querySelector('.col-out').addEventListener('click', () => {
            this.cycleCellValue(m, false);
          });
        });
      }
    }

    /**
     * Destaca um grupo em todos os elementos visuais (Mapa, Expressão e Cards)
     */
    highlightGroup(groupId) {
      this.hoveredGroupId = groupId;

      // Destaca termos na expressão
      $$('.expr-term', this.dom.exprFormula).forEach(el => {
        el.classList.toggle('is-hovered', el.dataset.groupId === groupId);
      });

      // Destaca caminhos no SVG
      $$('.k-loop-path', this.dom.svgOverlay).forEach(el => {
        el.classList.toggle('is-hovered', el.dataset.groupId === groupId);
      });

      // Destaca cards no painel lateral
      if (this.dom.groupsList) {
        $$('.k-group-card', this.dom.groupsList).forEach(el => {
          el.style.transform = (el.dataset.groupId === groupId) ? 'translateX(6px)' : '';
          el.style.boxShadow = (el.dataset.groupId === groupId) ? '0 0 12px var(--group-color)' : '';
        });
      }

      // Destaca células do mapa que pertencem ao grupo
      if (!this.lastSolution) return;
      const group = this.lastSolution.groups.find(g => g.id === groupId);
      const coveredSet = new Set(group ? group.minterms : []);

      $$('.k-cell', this.dom.cellsGrid).forEach(cell => {
        const m = parseInt(cell.dataset.minterm, 10);
        if (groupId && coveredSet.has(m)) {
          cell.classList.add('highlight-group');
          cell.style.setProperty('--highlight-color', group.color.stroke);
        } else {
          cell.classList.remove('highlight-group');
          cell.style.removeProperty('--highlight-color');
        }
      });
    }

    /**
     * Destaca célula específica do mapa ao passar o mouse na tabela verdade
     */
    highlightMapCell(m, isHovered) {
      const cell = $(`.k-cell[data-minterm="${m}"]`, this.dom.cellsGrid);
      if (cell) {
        cell.classList.toggle('highlight-group', isHovered);
      }
    }

    /**
     * Destaca linha da tabela verdade ao passar o mouse numa célula do mapa
     */
    highlightTruthTableRow(m, isHovered) {
      if (!this.dom.truthTableWrap) return;
      const tr = $(`tr[data-minterm="${m}"]`, this.dom.truthTableWrap);
      if (tr) {
        tr.style.background = isHovered ? 'var(--cell-hover)' : '';
      }
    }

    /**
     * Atualiza posições do SVG em resize
     */
    updateOverlayPositions() {
      if (this.lastSolution && this.dom.svgOverlay) {
        if (this.mode === 'auto') {
          this.renderGroupLoops(this.lastSolution.groups, this.lastSolution.config);
        } else {
          this.renderManualMode(this.lastSolution.config);
        }
      }
    }
  }

  // Inicializa quando o DOM estiver pronto
  window.addEventListener('DOMContentLoaded', () => {
    window.karnaughApp = new KarnaughApp();
  });

  return {
    KarnaughApp
  };
})();
