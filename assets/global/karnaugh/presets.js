/**
 * ============================================================================
 * KARNAUGH MAP PRESETS
 * Exemplos didáticos pré-configurados para aulas de circuitos lógicos
 * ============================================================================
 */

window.KarnaughPresets = (function () {
  'use strict';

  const PRESETS = [
    {
      id: 'four_corners',
      name: 'Quatro Cantos (Four Corners)',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [0, 2, 8, 10],
      dontCares: [],
      description: 'Demonstra o enrolamento toroidal: os 4 cantos do mapa (m0, m2, m8, m10) são adjacentes e formam uma quadra simplificada em B̄D̄.'
    },
    {
      id: 'col_wrap',
      name: 'Bordas Laterais (Grupo de 8)',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [0, 2, 4, 6, 8, 10, 12, 14],
      dontCares: [],
      description: 'As duas colunas das pontas (00 e 10) são adjacentes no toro e formam um octeto (8 células), eliminando 3 variáveis e resultando em D̄.'
    },
    {
      id: 'center_quad',
      name: 'Quadra Central',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [5, 7, 13, 15],
      dontCares: [],
      description: 'Grupo central clássico de 4 células adjacentes (m5, m7, m13, m15), eliminando A e C e resultando em BD.'
    },
    {
      id: 'dont_care',
      name: 'Com Don\'t Care (Condições de Indiferença)',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [1, 3, 5, 7, 9],
      dontCares: [11, 13, 15],
      description: 'Ao utilizar os Don\'t Cares (X) estrategicamente nas posições 11, 13 e 15, formamos um grupo de 8 células (D) em vez de grupos menores.'
    },
    {
      id: 'seven_seg',
      name: 'Display 7-Seg (Segmento \'a\')',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [0, 2, 3, 5, 6, 7, 8, 9],
      dontCares: [10, 11, 12, 13, 14, 15],
      description: 'Decodificador BCD para Display de 7 Segmentos: o segmento superior acende para os dígitos 0, 2, 3, 5, 6, 7, 8, 9, com estados 10-15 como Don\'t Care.'
    },
    {
      id: 'overlap',
      name: 'Grupos Sobrepostos',
      category: '4 Variáveis',
      numVars: 4,
      varNames: ['A', 'B', 'C', 'D'],
      minterms: [4, 5, 6, 7, 13, 15],
      dontCares: [],
      description: 'Células 5 e 7 são aproveitadas por dois grupos simultaneamente para maximizar o tamanho dos grupos e obter a expressão mínima: ĀB + BD.'
    },
    {
      id: 'aula6_ex1',
      name: 'Exemplo da Aula 6 (3 Variáveis)',
      category: '3 Variáveis',
      numVars: 3,
      varNames: ['A', 'B', 'C'],
      minterms: [1, 3, 4, 5, 6],
      dontCares: [],
      description: 'Exemplo típico de 3 variáveis: combinação de quadra e par cobrindo 5 mintermos.'
    },
    {
      id: 'wrap_3var',
      name: 'Adjacência em 3 Variáveis',
      category: '3 Variáveis',
      numVars: 3,
      varNames: ['A', 'B', 'C'],
      minterms: [0, 2, 4, 6],
      dontCares: [],
      description: 'As colunas 00 e 10 são adjacentes no mapa de 3 variáveis, formando uma quadra que simplifica para C̄.'
    },
    {
      id: 'xor_2var',
      name: 'Porta XOR (2 Variáveis)',
      category: '2 Variáveis',
      numVars: 2,
      varNames: ['A', 'B'],
      minterms: [1, 2],
      dontCares: [],
      description: 'Padrão tabuleiro de xadrez: mintermos diagonais (m1 e m2) não compartilham adjacência e resultam na expressão canônica ĀB + AB̄.'
    },
    {
      id: 'xor_3var',
      name: 'Paridade / XOR (3 Variáveis)',
      category: '3 Variáveis',
      numVars: 3,
      varNames: ['A', 'B', 'C'],
      minterms: [1, 2, 4, 7],
      dontCares: [],
      description: 'Função de paridade ímpar: nenhuma célula tem vizinhos adjacentes com valor 1, não havendo possibilidade de agrupamento.'
    }
  ];

  function getPresetById(id) {
    return PRESETS.find(p => p.id === id) || null;
  }

  function getPresetsByVars(numVars) {
    return PRESETS.filter(p => p.numVars === numVars);
  }

  return {
    PRESETS,
    getPresetById,
    getPresetsByVars
  };
})();
