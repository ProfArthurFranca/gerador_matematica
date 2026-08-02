/**
 * Gerador de listas e provas de matemática em LaTeX.
 *
 * Requer:
 * - Planilha principal com abas "Controle" e "Gerador"
 * - Bancos de questões em planilhas separadas com a estrutura:
 *   A ID_Questao, B Nivel, C Tipo, D Regras_Variaveis, E Enunciado_Template,
 *   F Imagem_TikZ, G Gabarito_Template, H Distratores
 */

const PLANILHA_PRINCIPAL = 'Gerador_Matemática';
const ABA_CONTROLE = 'Controle';
const ABA_GERADOR = 'Gerador';
const TAG_REGEX = /\[\[([A-Za-z0-9_]+)\]\]/g;
const DESTINO_RAIZ = true;
const PASTA_DESTINO_ID = '';

/**
 * Função principal do gerador.
 * @returns {Array<Object>} URLs dos arquivos salvos em Drive.
 */
function gerarTex() {
  const config = lerConfiguracoes();
  const resultados = [];

  for (const item of config.controleRows) {
    const tipo = String(item.tipo || '').trim();
    const quantidade = Math.max(1, Number(item.quantidade || 1));
    const nomeBase = String(item.nomeArquivo || '').trim();

    if (!nomeBase) {
      continue;
    }

    const versoesAluno = [];
    const versoesGabarito = [];

    for (let v = 0; v < quantidade; v += 1) {
      const bloco = gerarVersao(config.geradorRows, v + 1);
      versoesAluno.push(bloco.aluno);
      versoesGabarito.push(bloco.gabarito);
    }

    const texAluno = [
      gerar_cabecalho(tipo),
      versoesAluno.join('\n\n\\newpage\n\n'),
      '\\end{document}'
    ].join('\n\n');

    const texGabarito = [
      gerar_cabecalho(tipo),
      versoesGabarito.join('\n\n\\newpage\n\n'),
      '\\end{document}'
    ].join('\n\n');

    const arquivoAluno = salvarArquivoTex(nomeBase + '.tex', texAluno);
    const arquivoGabarito = salvarArquivoTex(nomeBase + '_Gabarito.tex', texGabarito);

    resultados.push({
      tipo,
      nomeArquivo: nomeBase,
      alunoUrl: arquivoAluno && arquivoAluno.getUrl ? arquivoAluno.getUrl() : '',
      gabaritoUrl: arquivoGabarito && arquivoGabarito.getUrl ? arquivoGabarito.getUrl() : ''
    });
  }

  return resultados;
}

/**
 * Lê as abas de configuração da planilha principal.
 * @returns {{controleRows: Array<Object>, geradorRows: Array<Object>}}
 */
function lerConfiguracoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const controleSheet = ss.getSheetByName(ABA_CONTROLE);
  const geradorSheet = ss.getSheetByName(ABA_GERADOR);

  if (!controleSheet || !geradorSheet) {
    throw new Error('Planilha principal deve conter as abas "Controle" e "Gerador".');
  }

  const controleValues = controleSheet.getDataRange().getValues();
  const geradorValues = geradorSheet.getDataRange().getValues();

  const controleRows = controleValues.slice(1)
    .map((linha) => ({
      tipo: linha[0] || '',
      quantidade: Number(linha[1] || 1),
      nomeArquivo: linha[2] || ''
    }))
    .filter((row) => row.tipo && row.nomeArquivo);

  const geradorRows = geradorValues.slice(1)
    .map((linha) => ({
      conteudo: linha[0] || '',
      idBanco: linha[1] || '',
      quantidade: Number(linha[2] || 0),
      nivel: linha[3] || '',
      tipo: linha[4] || ''
    }))
    .filter((row) => row.idBanco && row.quantidade > 0);

  return { controleRows, geradorRows };
}

/**
 * Busca questões de um banco de acordo com o nível, o tipo e a quantidade.
 * @param {string} idBanco ID da planilha do banco.
 * @param {string} nivel Filtro por nível.
 * @param {string} tipo Filtro por tipo.
 * @param {number} qtd Quantidade de questões para selecionar.
 * @returns {Array<Object>} Questões compatíveis.
 */
function buscarQuestoes(idBanco, nivel, tipo, qtd) {
  const ss = SpreadsheetApp.openById(idBanco);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  if (!values.length) {
    return [];
  }

  const dados = values.slice(1)
    .map((linha) => ({
      idQuestao: String(linha[0] || '').trim(),
      nivel: String(linha[1] || '').trim(),
      tipo: String(linha[2] || '').trim(),
      regrasVariaveis: String(linha[3] || '').trim(),
      enunciadoTemplate: String(linha[4] || '').trim(),
      imagemTikZ: String(linha[5] || '').trim(),
      gabaritoTemplate: String(linha[6] || '').trim(),
      distratores: String(linha[7] || '').trim()
    }))
    .filter((q) => {
      const nivelOk = !nivel || normalizarTexto(q.nivel) === normalizarTexto(nivel);
      const tipoOk = !tipo || normalizarTexto(q.tipo) === normalizarTexto(tipo);
      return q.idQuestao && nivelOk && tipoOk;
    });

  return embaralhar(dados).slice(0, Math.max(0, qtd || dados.length));
}

/**
 * Normaliza texto para comparações simples.
 * @param {string} texto Texto de entrada.
 * @returns {string}
 */
function normalizarTexto(texto) {
  return String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Interpreta a coluna de regras de variáveis.
 * @param {string} regras Regras separadas por ponto e vírgula.
 * @returns {Object} Variáveis geradas para a instância atual.
 */
function interpretarRegras(regras) {
  const vars = {};
  const listaRegras = String(regras || '').split(';').map((r) => r.trim()).filter(Boolean);

  for (const regra of listaRegras) {
    const match = regra.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }

    const nome = match[1];
    const valorRaw = match[2].trim();

    if (/^-?\d+\s*,\s*-?\d+\s*\[\s*\d+(?:\.\d+)?\s*\]$/.test(valorRaw)) {
      const partes = valorRaw.match(/^(-?\d+)\s*,\s*(-?\d+)\s*\[(\d+(?:\.\d+)?)\]$/);
      if (partes) {
        const min = Number(partes[1]);
        const max = Number(partes[2]);
        const step = Number(partes[3]) || 1;
        const range = Math.max(0, Math.floor((max - min) / step));
        const idx = Math.floor(Math.random() * (range + 1));
        vars[nome] = Number((min + (idx * step)).toFixed(6));
      }
      continue;
    }

    if (/^\[.*\]$/.test(valorRaw)) {
      const opcoes = valorRaw
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      vars[nome] = opcoes[Math.floor(Math.random() * opcoes.length)] || '';
      continue;
    }

    if (/^Calc\(/i.test(valorRaw)) {
      const expr = valorRaw.replace(/^Calc\s*\(/i, '').replace(/\)\s*$/, '').trim();
      const comTagsSubstituidas = expr.replace(TAG_REGEX, (matchTag, tag) => {
        return typeof vars[tag] !== 'undefined' ? vars[tag] : '0';
      });

      try {
        vars[nome] = safeEval(comTagsSubstituidas);
      } catch (e) {
        vars[nome] = 0;
      }
      continue;
    }
  }

  return vars;
}

/**
 * Avaliação segura de expressões matemáticas.
 * @param {string} expr Expressão matemática.
 * @returns {number}
 */
function safeEval(expr) {
  const cleaned = String(expr || '')
    .replace(/\s+/g, '')
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'PI')
    .replace(/\bpow\b/gi, 'pow')
    .replace(/\babs\b/gi, 'abs')
    .replace(/\bsqrt\b/gi, 'sqrt');

  const sanitized = cleaned.replace(/[^0-9A-Za-z+\-*/().,\[\]_^]/g, '');
  const fn = new Function('const {PI, abs, sqrt, pow, sin, cos, tan} = Math; return (' + sanitized + ');');
  return Number(fn());
}

/**
 * Limpeza matemática e visual do texto em LaTeX.
 * @param {string} texto Texto a limpar.
 * @returns {string}
 */
function limparMatematica(texto) {
  let out = String(texto || '');

  out = out.replace(/\+\s*-\s*/g, '-');
  out = out.replace(/-\s*-\s*/g, '+');
  out = out.replace(/\+\s*\+\s*/g, '+');
  out = out.replace(/\s+/g, ' ');

  out = out.replace(/(?<![A-Za-z])1([A-Za-z])/g, '$1');
  out = out.replace(/(?<![A-Za-z])-1([A-Za-z])/g, '-$1');

  out = out.replace(/\+\s*0\b/g, '');
  out = out.replace(/-\s*0\b/g, '');
  out = out.replace(/\b0\s*([+\-])/g, '$1');

  out = out.replace(/\s*([+\-])\s*/g, ' $1 ');
  out = out.replace(/\s{2,}/g, ' ');

  return out.trim();
}

/**
 * Cabeçalho LaTeX simples para edição posterior.
 * @param {string} tipo Tipo de produção (Lista ou Prova).
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
 * Substitui tags [[VAR]] por valores já calculados.
 * @param {string} template Texto com tags.
 * @param {Object} vars Variáveis da instância.
 * @returns {string}
 */
function aplicarTemplate(template, vars) {
  return String(template || '').replace(TAG_REGEX, (match, tag) => {
    return typeof vars[tag] !== 'undefined' ? limparMatematica(String(vars[tag])) : match;
  });
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
      const enunciado = limparMatematica(aplicarTemplate(q.enunciadoTemplate, vars));
      const gabarito = limparMatematica(aplicarTemplate(q.gabaritoTemplate, vars));
      const imagem = aplicarTemplate(q.imagemTikZ || '', vars);
      const opcoes = montarAlternativas(q, vars);

      const perguntaAluno = [
        '\\textbf{' + String(q.idQuestao || '') + '}',
        enunciado,
        imagem ? '\\begin{center}' + imagem + '\\end{center}' : '',
        isMultipla(q.tipo) ? montarListaAlternativas(opcoes.lista, false) : ''
      ].filter(Boolean).join('\n\n');

      const perguntaGabarito = [
        '\\textbf{' + String(q.idQuestao || '') + '}',
        enunciado,
        imagem ? '\\begin{center}' + imagem + '\\end{center}' : '',
        isMultipla(q.tipo)
          ? montarListaAlternativas(opcoes.lista, true, opcoes.indiceCorreta)
          : '\\textbf{Resposta:} ' + gabarito
      ].filter(Boolean).join('\n\n');

      blocoAluno.push(perguntaAluno);
      blocoGabarito.push(perguntaGabarito);
    }
  }

  return {
    aluno: ['\\section*{Versão ' + versao + '}', blocoAluno.join('\n\n')].join('\n\n'),
    gabarito: ['\\section*{Gabarito - Versão ' + versao + '}', blocoGabarito.join('\n\n')].join('\n\n')
  };
}

/**
 * Verifica se a questão é de múltipla escolha.
 * @param {string} tipo Tipo da questão.
 * @returns {boolean}
 */
function isMultipla(tipo) {
  return normalizarTexto(tipo).includes('multipla') || normalizarTexto(tipo).includes('múltipla');
}

/**
 * Monta as alternativas com embaralhamento e índice da resposta correta.
 * @param {Object} q Questão.
 * @param {Object} vars Variáveis já resolvidas.
 * @returns {{lista: Array<Object>, indiceCorreta: number}}
 */
function montarAlternativas(q, vars) {
  const correta = limparMatematica(aplicarTemplate(String(q.gabaritoTemplate || ''), vars));
  const distratores = String(q.distratores || '')
    .split(';')
    .map((item) => limparMatematica(aplicarTemplate(item, vars)))
    .filter(Boolean);

  const itens = [correta].concat(distratores).filter(Boolean);
  const embaralhadas = embaralhar(itens);
  const indiceCorreta = embaralhadas.findIndex((item) => item === correta);

  return {
    lista: embaralhadas.map((item, idx) => ({
      letra: String.fromCharCode(97 + idx),
      texto: item
    })),
    indiceCorreta
  };
}

/**
 * Gera um bloco LaTeX para enumerar alternativas.
 * @param {Array<Object>} alternativas Array de opções.
 * @param {boolean} destacarCorreta Se true, a opção correta será destacada.
 * @param {number} indiceCorreta Índice da alternativa correta no array embaralhado.
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

/**
 * Embaralha um array com Fisher-Yates.
 * @param {Array<any>} arr Array de entrada.
 * @returns {Array<any>}
 */
function embaralhar(arr) {
  const copia = [].concat(arr);
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Salva o conteúdo LaTeX em um arquivo no Drive.
 * @param {string} nome Nome do arquivo.
 * @param {string} conteudo Conteúdo LaTeX.
 * @returns {GoogleAppsScript.Drive.File}
 */
function salvarArquivoTex(nome, conteudo) {
  const pasta = DESTINO_RAIZ ? DriveApp.getRootFolder() : DriveApp.getFolderById(PASTA_DESTINO_ID);
  const blob = Utilities.newBlob(conteudo, 'application/x-tex', nome);
  return pasta.createFile(blob);
}

/**
 * Função de teste simples para depuração.
 */
function testeGerarTex() {
  Logger.log(JSON.stringify(gerarTex()));
}

