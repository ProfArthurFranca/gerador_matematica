/**
 * Funções específicas de construção de estruturas LaTeX.
 */

/**
 * Cria o preâmbulo do LaTeX com o estilo pedido.
 * @returns {string}
 */
function criarPreambuloLatex() {
  return '\\documentclass[12pt,a4paper]{article}\n' +
    '\\usepackage[utf8]{inputenc}\n' +
    '\\usepackage[brazil]{babel}\n' +
    '\\usepackage[margin=1.5cm]{geometry}\n' +
    '\\usepackage{amsmath,amssymb}\n' +
    '\\usepackage{tikz}\n' +
    '\\usepackage{graphicx}\n' +
    '\\graphicspath{{Logo/}}\n' +
    '\\usepackage{enumitem}\n' +
    '\\pagenumbering{gobble}\n' +
    '\\pagestyle{empty}\n' +
    '\\begin{document}\n';
}

/**
 * Cria o cabeçalho estilizado para Lista ou Prova.
 * @param {string} tipo Tipo da produção.
 * @param {string} titulo Título do documento.
 * @param {number|string} sequencial Sequencial exibido.
 * @returns {string}
 */
function criarCabecalho(tipo, titulo, sequencial) {
  var tituloEscapado = escapeLatex(titulo);

  return '\\begin{center}\n' +
    '\\begin{tikzpicture}[x=1cm,y=1cm]\n' +
    '\\node[anchor=west] at (0, 0.2)\n' +
    '  {\\includegraphics[height=2.3cm]{Logo/logo_colegio.png}};\n' +
    '\\node[anchor=east] at (18.8, 0.2)\n' +
    '  {\\includegraphics[height=1.8cm]{Logo/logo_pitagoras.png}};\n' +
    '\\node[font=\\Large] at (9.4, 1.75)\n' +
    '  {\\textbf{' + tituloEscapado + '}};\n' +
    '\\draw[rounded corners=2mm] (3.0, 0.55) rectangle (16.5, 1.15);\n' +
    '\\node[font=\\bfseries\\small, anchor=west] at (3.2, 0.85) {Nome:};\n' +
    '\\draw[rounded corners=2mm] (3.0, -0.2) rectangle (6.8, 0.4);\n' +
    '\\node[font=\\bfseries\\small] at (3.7, 0.1) {Data:};\n' +
    '\\node[font=\\small] at (5.3, 0.1) {\\_\\_\\_/\\_\\_\\_/\\_\\_\\_};\n' +
    '\\draw[rounded corners=2mm] (7.3, -0.2) rectangle (13.2, 0.4);\n' +
    '\\node[font=\\bfseries\\small] at (8.4, 0.1) {Prof.:};\n' +
    '\\node[font=\\small] at (10.8, 0.1) {Arthur França};\n' +
    '\\draw[rounded corners=2mm] (13.7, -0.2) rectangle (16.5, 0.4);\n' +
    '\\node[font=\\bfseries\\small] at (15.1, 0.1) {Seq: ' + sequencial + '};\n' +
    '\\end{tikzpicture}\n' +
    '\\end{center}\n' +
    '\\vspace{0.2cm}\n';
}

/**
 * Cria o cabeçalho para o documento de Gabarito.
 * @param {string} titulo Título do documento.
 * @param {number|string} sequencial Sequencial exibido.
 * @returns {string}
 */
function criarCabecalhoGabarito(titulo, sequencial) {
  return '\\begin{center}\n' +
    '  {\\Large\\bfseries GABARITO — ' + escapeLatex(titulo) + '}\\\\[3pt]\n' +
    '  {\\large \\textbf{Sequência:} ' + sequencial + '}\n' +
    '\\end{center}\n' +
    '\\hrule\n\\vspace{0.3cm}\n';
}

/**
 * Escapa caracteres especiais do LaTeX.
 * @param {string} texto Texto a escapar.
 * @returns {string}
 */
function escapeLatex(texto) {
  return String(texto || '')
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}');
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
