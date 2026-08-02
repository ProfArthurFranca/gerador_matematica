/**
 * Funções específicas de construção de estruturas LaTeX.
 */

/**
 * Gera o preâmbulo do LaTeX.
 * @param {string} tipo Tipo da saída: Lista ou Prova.
 * @returns {string}
 */
function gerar_cabecalho(tipo) {
  return [
    '\\documentclass[12pt]{article}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage{amsmath,amssymb}',
    '\\usepackage{enumitem}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    ''
  ].join('\n');
}

/**
 * Cria um bloco de questão para o arquivo do aluno.
 * @param {Object} q Questão da base.
 * @param {Object} vars Variáveis resolvidas.
 * @returns {string}
 */
function criarQuestaoAluno(q, vars) {
  const enunciado = limparMatematica(aplicarTemplate(q.enunciadoTemplate, vars));
  const imagem = aplicarTemplate(q.imagemTikZ || '', vars);
  const opcoes = montarAlternativas(q, vars);

  return [
    '\\textbf{' + String(q.idQuestao || '') + '}',
    enunciado,
    imagem ? '\\begin{center}' + imagem + '\\end{center}' : '',
    isMultipla(q.tipo) ? montarListaAlternativas(opcoes.lista, false) : ''
  ].filter(Boolean).join('\n\n');
}

/**
 * Cria um bloco de questão para o arquivo de gabarito.
 * @param {Object} q Questão da base.
 * @param {Object} vars Variáveis resolvidas.
 * @returns {string}
 */
function criarQuestaoGabarito(q, vars) {
  const enunciado = limparMatematica(aplicarTemplate(q.enunciadoTemplate, vars));
  const gabarito = limparMatematica(aplicarTemplate(q.gabaritoTemplate, vars));
  const imagem = aplicarTemplate(q.imagemTikZ || '', vars);
  const opcoes = montarAlternativas(q, vars);

  return [
    '\\textbf{' + String(q.idQuestao || '') + '}',
    enunciado,
    imagem ? '\\begin{center}' + imagem + '\\end{center}' : '',
    isMultipla(q.tipo)
      ? montarListaAlternativas(opcoes.lista, true, opcoes.indiceCorreta)
      : '\\textbf{Resposta:} ' + gabarito
  ].filter(Boolean).join('\n\n');
}

/**
 * Gera uma versão completa da prova/lista.
 * @param {Array<Object>} geradorRows Linhas da aba Gerador.
 * @param {number} versao Número da versão.
 * @returns {{aluno: string, gabarito: string}}
 */
function gerarVersao(geradorRows, versao) {
  const blocoAluno = [];
  const blocoGabarito = [];

  for (const row of geradorRows) {
    const questoes = buscarQuestoes(row.idBanco, row.nivel, row.tipo, row.quantidade);

    for (const q of questoes) {
      const vars = interpretarRegras(q.regrasVariaveis);
      blocoAluno.push(criarQuestaoAluno(q, vars));
      blocoGabarito.push(criarQuestaoGabarito(q, vars));
    }
  }

  return {
    aluno: ['\\section*{Versão ' + versao + '}', blocoAluno.join('\n\n')].join('\n\n'),
    gabarito: ['\\section*{Gabarito - Versão ' + versao + '}', blocoGabarito.join('\n\n')].join('\n\n')
  };
}

/**
 * Gera bloco LaTeX para enumerar alternativas.
 * @param {Array<Object>} alternativas Array de opções.
 * @param {boolean} destacarCorreta Se true, destaca a opção correta.
 * @param {number} indiceCorreta Índice da alternativa correta.
 * @returns {string}
 */
function montarListaAlternativas(alternativas, destacarCorreta, indiceCorreta) {
  if (!alternativas || !alternativas.length) {
    return '';
  }

  const linhas = alternativas.map((alt, idx) => {
    const texto = destacarCorreta && idx === indiceCorreta
      ? '\\textbf{' + alt.texto + '}'
      : alt.texto;

    return '\\item ' + texto;
  });

  return [
    '\\begin{enumerate}[label=\\textbf{\\alph*)}]',
    linhas.join('\n'),
    '\\end{enumerate}'
  ].join('\n');
}
