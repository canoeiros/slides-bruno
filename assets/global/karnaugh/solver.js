/**
 * ============================================================================
 * KARNAUGH MAP SOLVER & MINIMIZATION ENGINE
 * Resolução exata de Mapas de Karnaugh (2, 3 e 4 variáveis)
 * Quine-McCluskey, Implicantes Primos, Implicantes Essenciais,
 * Decomposição Geométrica Toroidal (Wrap-around) e Validação Didática.
 * ============================================================================
 */

window.KarnaughSolver = (function () {
  'use strict';

  // Códigos de Gray padrão para os eixos do Mapa de Karnaugh
  const GRAY_CODES = {
    1: ['0', '1'],
    2: ['00', '01', '11', '10']
  };

  /**
   * Retorna os códigos de Gray para N bits (1 ou 2 bits)
   */
  function getGrayCodes(numBits) {
    if (GRAY_CODES[numBits]) return [...GRAY_CODES[numBits]];
    if (numBits === 1) return ['0', '1'];
    return ['00', '01', '11', '10'];
  }

  /**
   * Configuração de dimensões e variáveis para N variáveis (2, 3 ou 4)
   */
  function getGridConfig(numVars, customNames = null) {
    let names = ['A', 'B', 'C', 'D'].slice(0, numVars);
    if (Array.isArray(customNames) && customNames.length >= numVars) {
      names = customNames.slice(0, numVars);
    }

    if (numVars === 2) {
      return {
        numVars: 2,
        varNames: names,
        rowVars: [names[0]],
        colVars: [names[1]],
        rowBits: 1,
        colBits: 1,
        rows: 2,
        cols: 2,
        rowGray: getGrayCodes(1),
        colGray: getGrayCodes(1)
      };
    } else if (numVars === 3) {
      return {
        numVars: 3,
        varNames: names,
        rowVars: [names[0]],
        colVars: [names[1], names[2]],
        rowBits: 1,
        colBits: 2,
        rows: 2,
        cols: 4,
        rowGray: getGrayCodes(1),
        colGray: getGrayCodes(2)
      };
    } else {
      // 4 variáveis (padrão)
      return {
        numVars: 4,
        varNames: names,
        rowVars: [names[0], names[1]],
        colVars: [names[2], names[3]],
        rowBits: 2,
        colBits: 2,
        rows: 4,
        cols: 4,
        rowGray: getGrayCodes(2),
        colGray: getGrayCodes(2)
      };
    }
  }

  /**
   * Converte coordenadas (r, c) da grade para índice de mintermo decimal (0..2^N-1)
   */
  function coordsToMinterm(r, c, config) {
    const rowStr = config.rowGray[r];
    const colStr = config.colGray[c];
    const binStr = rowStr + colStr;
    return parseInt(binStr, 2);
  }

  /**
   * Converte índice de mintermo decimal para coordenadas (r, c) da grade
   */
  function mintermToCoords(m, config) {
    const binStr = m.toString(2).padStart(config.numVars, '0');
    const rowStr = binStr.slice(0, config.rowBits);
    const colStr = binStr.slice(config.rowBits);
    const r = config.rowGray.indexOf(rowStr);
    const c = config.colGray.indexOf(colStr);
    return { r, c, binStr, minterm: m };
  }

  /**
   * Converte número decimal em string binária com N bits
   */
  function toBinaryString(val, bits) {
    return val.toString(2).padStart(bits, '0');
  }

  /**
   * Conta a quantidade de '1's em um padrão ternário (ex: '01-1' -> 2)
   */
  function countOnes(pattern) {
    let count = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') count++;
    }
    return count;
  }

  /**
   * Tenta combinar dois termos que diferem em exatamente 1 bit ('0' e '1')
   * Retorna o termo combinado com '-' na posição ou null se incompatíveis
   */
  function combineTerms(termA, termB) {
    if (termA.length !== termB.length) return null;
    let diffIndex = -1;
    for (let i = 0; i < termA.length; i++) {
      const cA = termA[i];
      const cB = termB[i];
      if (cA !== cB) {
        if (diffIndex !== -1) return null; // Mais de uma diferença
        if ((cA === '0' && cB === '1') || (cA === '1' && cB === '0')) {
          diffIndex = i;
        } else {
          return null; // Um deles é '-' e o outro não
        }
      }
    }
    if (diffIndex === -1) return null;
    return termA.slice(0, diffIndex) + '-' + termA.slice(diffIndex + 1);
  }

  /**
   * Verifica se um implicante ternário cobre um dado mintermo binário
   */
  function implicantCovers(implicant, binStr) {
    for (let i = 0; i < implicant.length; i++) {
      if (implicant[i] !== '-' && implicant[i] !== binStr[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Retorna todos os mintermos numéricos cobertos por um implicante ternário
   */
  function getMintermsCovered(implicant, numVars) {
    const results = [];
    const total = 1 << numVars;
    for (let m = 0; m < total; m++) {
      const binStr = toBinaryString(m, numVars);
      if (implicantCovers(implicant, binStr)) {
        results.push(m);
      }
    }
    return results;
  }

  /**
   * Algoritmo de Quine-McCluskey completo para encontrar todos os Implicantes Primos
   */
  function findPrimeImplicants(activeMinterms, numVars) {
    if (activeMinterms.length === 0) return [];
    if (activeMinterms.length === (1 << numVars)) {
      return ['-'.repeat(numVars)];
    }

    // Inicializa os grupos por contagem de 1s
    let currentGroups = {};
    for (const m of activeMinterms) {
      const bin = toBinaryString(m, numVars);
      const ones = countOnes(bin);
      if (!currentGroups[ones]) currentGroups[ones] = new Set();
      currentGroups[ones].add(bin);
    }

    const primeImplicants = new Set();

    while (Object.keys(currentGroups).length > 0) {
      const nextGroups = {};
      const combinedInThisRound = new Set();
      const groupKeys = Object.keys(currentGroups).map(Number).sort((a, b) => a - b);

      for (let i = 0; i < groupKeys.length; i++) {
        const k1 = groupKeys[i];
        const k2 = k1 + 1;
        if (!currentGroups[k2]) continue;

        const set1 = currentGroups[k1];
        const set2 = currentGroups[k2];

        for (const term1 of set1) {
          for (const term2 of set2) {
            const combined = combineTerms(term1, term2);
            if (combined !== null) {
              combinedInThisRound.add(term1);
              combinedInThisRound.add(term2);
              const ones = countOnes(combined);
              if (!nextGroups[ones]) nextGroups[ones] = new Set();
              nextGroups[ones].add(combined);
            }
          }
        }
      }

      // Todos os termos deste round que não combinaram com ninguém são Primos!
      for (const k of groupKeys) {
        for (const term of currentGroups[k]) {
          if (!combinedInThisRound.has(term)) {
            primeImplicants.add(term);
          }
        }
      }

      currentGroups = nextGroups;
    }

    return Array.from(primeImplicants);
  }

  /**
   * Seleciona a cobertura mínima de Implicantes Primos (Quine-McCluskey / Petrick)
   * Garante que todos os mintermos alvos (1s no SOP ou 0s no POS) sejam cobertos.
   */
  function selectMinimalCover(primeImplicants, targetMinterms, numVars) {
    if (targetMinterms.length === 0) return { selected: [], essential: [] };

    // Mapeia para cada mintermo alvo quais PIs o cobrem
    const piCovers = new Map();
    for (const pi of primeImplicants) {
      const covered = getMintermsCovered(pi, numVars).filter(m => targetMinterms.includes(m));
      if (covered.length > 0) {
        piCovers.set(pi, covered);
      }
    }

    const validPIs = Array.from(piCovers.keys());
    if (validPIs.length === 0) return { selected: [], essential: [] };

    // Identifica Implicantes Primos Essenciais (EPI)
    const essential = new Set();
    const uncovered = new Set(targetMinterms);

    for (const m of targetMinterms) {
      const coveringPIs = validPIs.filter(pi => piCovers.get(pi).includes(m));
      if (coveringPIs.length === 1) {
        essential.add(coveringPIs[0]);
      }
    }

    // Remove mintermos cobertos pelos essenciais
    for (const epi of essential) {
      for (const m of piCovers.get(epi)) {
        uncovered.delete(m);
      }
    }

    const selected = new Set(essential);

    // Se ainda há mintermos descobertos, resolve cobertura residual com branch-and-bound
    if (uncovered.size > 0) {
      const remainingMinterms = Array.from(uncovered);
      const candidatePIs = validPIs.filter(pi => !essential.has(pi));

      // Busca exaustiva otimizada pelo menor conjunto
      let bestCombination = null;

      function search(index, currentSet, coveredMinterms) {
        // Poda se o conjunto atual já for maior ou igual ao melhor encontrado
        if (bestCombination && currentSet.length >= bestCombination.length) return;

        // Verifica se todos foram cobertos
        const allCovered = remainingMinterms.every(m => coveredMinterms.has(m));
        if (allCovered) {
          if (!bestCombination || currentSet.length < bestCombination.length) {
            bestCombination = [...currentSet];
          }
          return;
        }

        if (index >= candidatePIs.length) return;

        // Opção 1: Incluir candidatePIs[index]
        const pi = candidatePIs[index];
        const newlyCovered = new Set(coveredMinterms);
        for (const m of piCovers.get(pi)) {
          newlyCovered.add(m);
        }

        currentSet.push(pi);
        search(index + 1, currentSet, newlyCovered);
        currentSet.pop();

        // Opção 2: Pular candidatePIs[index]
        search(index + 1, currentSet, coveredMinterms);
      }

      search(0, [], new Set());

      if (bestCombination) {
        for (const pi of bestCombination) {
          selected.add(pi);
        }
      }
    }

    return {
      selected: Array.from(selected),
      essential: Array.from(essential)
    };
  }

  /**
   * Converte padrão ternário (ex: '1-0-') em termo algébrico SOP ou POS
   */
  function formatTerm(implicant, varNames, type = 'SOP') {
    const eliminated = [];
    const constants = [];

    for (let i = 0; i < implicant.length; i++) {
      const v = varNames[i];
      const bit = implicant[i];
      if (bit === '-') {
        eliminated.push(v);
      } else {
        constants.push({ var: v, val: bit });
      }
    }

    if (constants.length === 0) {
      return {
        plain: '1',
        html: '1',
        latex: '1',
        eliminated,
        constants
      };
    }

    if (type === 'SOP') {
      // SOP: bit 1 -> A, bit 0 -> A' / Ā
      const partsPlain = constants.map(c => c.val === '1' ? c.var : `${c.var}'`);
      const partsHtml = constants.map(c => c.val === '1' ? c.var : `<span class="k-not">${c.var}</span>`);
      const partsLatex = constants.map(c => c.val === '1' ? c.var : `\\overline{${c.var}}`);

      return {
        plain: partsPlain.join(''),
        html: partsHtml.join(''),
        latex: partsLatex.join(''),
        eliminated,
        constants
      };
    } else {
      // POS: agrupando 0s. Bit 0 -> A, bit 1 -> A' / Ā, unidos por +
      const partsPlain = constants.map(c => c.val === '0' ? c.var : `${c.var}'`);
      const partsHtml = constants.map(c => c.val === '0' ? c.var : `<span class="k-not">${c.var}</span>`);
      const partsLatex = constants.map(c => c.val === '0' ? c.var : `\\overline{${c.var}}`);

      const plain = `(${partsPlain.join(' + ')})`;
      const html = `(${partsHtml.join(' + ')})`;
      const latex = `(${partsLatex.join(' + ')})`;

      return {
        plain,
        html,
        latex,
        eliminated,
        constants
      };
    }
  }

  /**
   * Decompõe geometricamente os mintermos de um grupo para renderização visual
   * Detecta se o grupo é um retângulo simples, bordas toroidais ou os 4 cantos.
   */
  function decomposeGroupGeometry(coordsList, config) {
    const numRows = config.rows;
    const numCols = config.cols;

    // Coleta conjuntos de linhas e colunas
    const rowSet = new Set(coordsList.map(c => c.r));
    const colSet = new Set(coordsList.map(c => c.c));
    const rowArray = Array.from(rowSet).sort((a, b) => a - b);
    const colArray = Array.from(colSet).sort((a, b) => a - b);

    // Caso especial 1: Os 4 cantos em 4 variáveis
    // Linhas {0, 3} e Colunas {0, 3}
    if (
      numRows === 4 && numCols === 4 &&
      rowArray.length === 2 && rowArray[0] === 0 && rowArray[1] === 3 &&
      colArray.length === 2 && colArray[0] === 0 && colArray[1] === 3 &&
      coordsList.length === 4
    ) {
      return {
        type: 'four_corners',
        boxes: [
          { r1: 0, r2: 0, c1: 0, c2: 0, wrap: 'corner-tl', corner: 'tl' },
          { r1: 0, r2: 0, c1: 3, c2: 3, wrap: 'corner-tr', corner: 'tr' },
          { r1: 3, r2: 3, c1: 0, c2: 0, wrap: 'corner-bl', corner: 'bl' },
          { r1: 3, r2: 3, c1: 3, c2: 3, wrap: 'corner-br', corner: 'br' }
        ]
      };
    }

    // Detecta quebra toroidal horizontal (colunas nas extremidades {0, maxCols-1})
    const isColWrap = (
      colArray.length >= 2 &&
      colArray[0] === 0 &&
      colArray[colArray.length - 1] === numCols - 1 &&
      !isContiguous(colArray)
    );

    // Detecta quebra toroidal vertical (linhas nas extremidades {0, maxRows-1})
    const isRowWrap = (
      numRows > 2 &&
      rowArray.length >= 2 &&
      rowArray[0] === 0 &&
      rowArray[rowArray.length - 1] === numRows - 1 &&
      !isContiguous(rowArray)
    );

    function isContiguous(arr) {
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr[i - 1] + 1) return false;
      }
      return true;
    }

    function splitWrapInterval(arr, max) {
      const left = [];
      const right = [];
      for (const val of arr) {
        if (val < max / 2) left.push(val);
        else right.push(val);
      }
      return [left, right];
    }

    const boxes = [];

    if (isColWrap && isRowWrap) {
      // 4 sub-retângulos toroidais
      const [rLeft, rRight] = splitWrapInterval(rowArray, numRows);
      const [cLeft, cRight] = splitWrapInterval(colArray, numCols);
      boxes.push({ r1: rLeft[0], r2: rLeft[rLeft.length - 1], c1: cLeft[0], c2: cLeft[cLeft.length - 1], wrap: 'corner-tl' });
      boxes.push({ r1: rLeft[0], r2: rLeft[rLeft.length - 1], c1: cRight[0], c2: cRight[cRight.length - 1], wrap: 'corner-tr' });
      boxes.push({ r1: rRight[0], r2: rRight[rRight.length - 1], c1: cLeft[0], c2: cLeft[cLeft.length - 1], wrap: 'corner-bl' });
      boxes.push({ r1: rRight[0], r2: rRight[rRight.length - 1], c1: cRight[0], c2: cRight[cRight.length - 1], wrap: 'corner-br' });
      return { type: 'wrap_both', boxes };
    }

    if (isColWrap) {
      // 2 sub-retângulos (lados esquerdo e direito)
      const [cLeft, cRight] = splitWrapInterval(colArray, numCols);
      boxes.push({ r1: rowArray[0], r2: rowArray[rowArray.length - 1], c1: cLeft[0], c2: cLeft[cLeft.length - 1], wrap: 'col-left' });
      boxes.push({ r1: rowArray[0], r2: rowArray[rowArray.length - 1], c1: cRight[0], c2: cRight[cRight.length - 1], wrap: 'col-right' });
      return { type: 'wrap_horizontal', boxes };
    }

    if (isRowWrap) {
      // 2 sub-retângulos (topo e base)
      const [rTop, rBottom] = splitWrapInterval(rowArray, numRows);
      boxes.push({ r1: rTop[0], r2: rTop[rTop.length - 1], c1: colArray[0], c2: colArray[colArray.length - 1], wrap: 'row-top' });
      boxes.push({ r1: rBottom[0], r2: rBottom[rBottom.length - 1], c1: colArray[0], c2: colArray[colArray.length - 1], wrap: 'row-bottom' });
      return { type: 'wrap_vertical', boxes };
    }

    // Retângulo contíguo normal
    boxes.push({
      r1: rowArray[0],
      r2: rowArray[rowArray.length - 1],
      c1: colArray[0],
      c2: colArray[colArray.length - 1],
      wrap: 'none'
    });

    return { type: 'standard', boxes };
  }

  /**
   * Paleta vibrante e harmoniosa de cores para agrupamentos visuais
   */
  const GROUP_PALETTE = [
    { name: 'Rose', fill: 'rgba(244, 63, 94, 0.22)', stroke: '#f43f5e', border: '#f43f5e', text: '#fda4af', tagBg: 'rgba(244, 63, 94, 0.15)' },
    { name: 'Emerald', fill: 'rgba(16, 185, 129, 0.22)', stroke: '#10b981', border: '#10b981', text: '#6ee7b7', tagBg: 'rgba(16, 185, 129, 0.15)' },
    { name: 'Violet', fill: 'rgba(139, 92, 246, 0.22)', stroke: '#8b5cf6', border: '#8b5cf6', text: '#c4b5fd', tagBg: 'rgba(139, 92, 246, 0.15)' },
    { name: 'Amber', fill: 'rgba(245, 158, 11, 0.22)', stroke: '#f59e0b', border: '#f59e0b', text: '#fcd34d', tagBg: 'rgba(245, 158, 11, 0.15)' },
    { name: 'Cyan', fill: 'rgba(6, 182, 212, 0.22)', stroke: '#06b6d4', border: '#06b6d4', text: '#67e8f9', tagBg: 'rgba(6, 182, 212, 0.15)' },
    { name: 'Fuchsia', fill: 'rgba(217, 70, 239, 0.22)', stroke: '#d946ef', border: '#d946ef', text: '#f0abfc', tagBg: 'rgba(217, 70, 239, 0.15)' },
    { name: 'Blue', fill: 'rgba(59, 130, 246, 0.22)', stroke: '#3b82f6', border: '#3b82f6', text: '#93c5fd', tagBg: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Lime', fill: 'rgba(132, 204, 22, 0.22)', stroke: '#84cc16', border: '#84cc16', text: '#bef264', tagBg: 'rgba(132, 204, 22, 0.15)' }
  ];

  /**
   * Função principal de solução do Mapa de Karnaugh
   */
  function solve(options) {
    const numVars = options.numVars || 4;
    const config = getGridConfig(numVars, options.varNames);
    const values = options.values; // Array de tamanho 2^numVars ('0', '1', 'X')
    const type = (options.type || 'SOP').toUpperCase();

    const totalCells = 1 << numVars;
    const ones = [];
    const zeros = [];
    const dontCares = [];

    for (let m = 0; m < totalCells; m++) {
      const v = (values[m] !== undefined) ? String(values[m]).toUpperCase() : '0';
      if (v === '1') ones.push(m);
      else if (v === 'X') dontCares.push(m);
      else zeros.push(m);
    }

    // Alvos para SOP são 1s; para POS são 0s
    const targetMinterms = (type === 'SOP') ? ones : zeros;
    const candidates = [...targetMinterms, ...dontCares];

    // Casos triviais
    if (targetMinterms.length === 0) {
      const constantVal = (type === 'SOP') ? '0' : '1';
      return {
        config,
        type,
        groups: [],
        expression: {
          plain: `F = ${constantVal}`,
          html: `F = <strong>${constantVal}</strong>`,
          latex: `F = ${constantVal}`,
          termsCount: 0
        },
        minterms: { ones, zeros, dontCares },
        isConstant: true,
        constantVal
      };
    }

    if (candidates.length === totalCells && targetMinterms.length > 0) {
      const constantVal = (type === 'SOP') ? '1' : '0';
      // Se todos são cobertos por um único grupo de tamanho total
      const allTerm = '-'.repeat(numVars);
      const formatted = formatTerm(allTerm, config.varNames, type);
      const geometry = decomposeGroupGeometry(
        Array.from({ length: totalCells }, (_, i) => mintermToCoords(i, config)),
        config
      );

      return {
        config,
        type,
        groups: [{
          id: 'g0',
          implicant: allTerm,
          term: formatted,
          minterms: Array.from({ length: totalCells }, (_, i) => i),
          coords: Array.from({ length: totalCells }, (_, i) => mintermToCoords(i, config)),
          geometry,
          color: GROUP_PALETTE[0],
          isEssential: true,
          size: totalCells
        }],
        expression: {
          plain: `F = ${constantVal}`,
          html: `F = <strong>${constantVal}</strong>`,
          latex: `F = ${constantVal}`,
          termsCount: 1
        },
        minterms: { ones, zeros, dontCares },
        isConstant: true,
        constantVal
      };
    }

    // 1. Encontra todos os Implicantes Primos
    const allPIs = findPrimeImplicants(candidates, numVars);

    // 2. Filtra PIs que cobrem apenas Don't Cares
    const usefulPIs = allPIs.filter(pi => {
      const covered = getMintermsCovered(pi, numVars);
      return covered.some(m => targetMinterms.includes(m));
    });

    // 3. Seleciona a cobertura mínima
    const { selected, essential } = selectMinimalCover(usefulPIs, targetMinterms, numVars);

    // 4. Constrói detalhes e geometria de cada grupo selecionado
    const groups = selected.map((implicant, idx) => {
      const coveredMinterms = getMintermsCovered(implicant, numVars);
      const coords = coveredMinterms.map(m => mintermToCoords(m, config));
      const geometry = decomposeGroupGeometry(coords, config);
      const term = formatTerm(implicant, config.varNames, type);
      const color = GROUP_PALETTE[idx % GROUP_PALETTE.length];
      const isEss = essential.includes(implicant);

      return {
        id: `g${idx}`,
        implicant,
        term,
        minterms: coveredMinterms,
        coords,
        geometry,
        color,
        isEssential: isEss,
        size: coveredMinterms.length
      };
    });

    // Ordena grupos por tamanho decrescente (grupos maiores primeiro)
    groups.sort((a, b) => b.size - a.size);

    // 5. Monta as expressões finais
    let plainExpr = '';
    let htmlExpr = '';
    let latexExpr = '';

    if (type === 'SOP') {
      plainExpr = 'F = ' + groups.map(g => g.term.plain).join(' + ');
      htmlExpr = 'F = ' + groups.map(g => `<span class="expr-term" data-group-id="${g.id}" style="--group-color: ${g.color.border}">${g.term.html}</span>`).join(' + ');
      latexExpr = 'F = ' + groups.map(g => g.term.latex).join(' + ');
    } else {
      plainExpr = 'F = ' + groups.map(g => g.term.plain).join(' · ');
      htmlExpr = 'F = ' + groups.map(g => `<span class="expr-term" data-group-id="${g.id}" style="--group-color: ${g.color.border}">${g.term.html}</span>`).join(' · ');
      latexExpr = 'F = ' + groups.map(g => g.term.latex).join(' \\cdot ');
    }

    return {
      config,
      type,
      groups,
      expression: {
        plain: plainExpr,
        html: htmlExpr,
        latex: latexExpr,
        termsCount: groups.length
      },
      minterms: { ones, zeros, dontCares },
      isConstant: false
    };
  }

  /**
   * Valida se um conjunto arbitrário de mintermos selecionados manualmente forma um grupo válido
   */
  function validateManualGroup(selectedMinterms, config, values, type = 'SOP') {
    if (!selectedMinterms || selectedMinterms.length === 0) {
      return { valid: false, message: 'Nenhuma célula selecionada.' };
    }

    const count = selectedMinterms.length;

    // Deve ser potência de 2
    const isPowerOfTwo = (count > 0) && ((count & (count - 1)) === 0);
    if (!isPowerOfTwo) {
      return {
        valid: false,
        message: `O tamanho (${count}) não é uma potência de 2. Grupos devem ter 1, 2, 4, 8 ou 16 células.`
      };
    }

    // Não pode conter valores contraditórios
    const forbiddenVal = (type === 'SOP') ? '0' : '1';
    for (const m of selectedMinterms) {
      const v = String(values[m] || '0').toUpperCase();
      if (v === forbiddenVal) {
        return {
          valid: false,
          message: `O grupo contém células com valor '${forbiddenVal}', o que é inválido no modo ${type}.`
        };
      }
    }

    // Verifica se os mintermos formam um padrão ternário válido
    const binStrings = selectedMinterms.map(m => toBinaryString(m, config.numVars));
    const first = binStrings[0];
    const implicantArr = first.split('');

    for (let bitIdx = 0; bitIdx < config.numVars; bitIdx++) {
      const initialBit = first[bitIdx];
      let varies = false;
      for (let i = 1; i < binStrings.length; i++) {
        if (binStrings[i][bitIdx] !== initialBit) {
          varies = true;
          break;
        }
      }
      if (varies) {
        implicantArr[bitIdx] = '-';
      }
    }

    const candidateImplicant = implicantArr.join('');
    const fullCovered = getMintermsCovered(candidateImplicant, config.numVars);

    // Se a cobertura do implicante deduzido contém exatamente as células selecionadas, é válido!
    if (fullCovered.length !== selectedMinterms.length) {
      return {
        valid: false,
        message: 'As células selecionadas não formam um retângulo fechado no toro de Karnaugh.'
      };
    }

    for (const m of selectedMinterms) {
      if (!fullCovered.includes(m)) {
        return {
          valid: false,
          message: 'As células selecionadas não formam um grupo adjacente contíguo.'
        };
      }
    }

    const term = formatTerm(candidateImplicant, config.varNames, type);
    const coords = selectedMinterms.map(m => mintermToCoords(m, config));
    const geometry = decomposeGroupGeometry(coords, config);

    return {
      valid: true,
      message: `Grupo válido! Tamanho: ${count}. Termo: ${term.plain}`,
      implicant: candidateImplicant,
      term,
      geometry,
      coords
    };
  }

  // API pública do módulo
  return {
    getGridConfig,
    coordsToMinterm,
    mintermToCoords,
    toBinaryString,
    solve,
    validateManualGroup,
    formatTerm,
    decomposeGroupGeometry,
    GROUP_PALETTE
  };
})();
