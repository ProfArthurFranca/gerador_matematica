/**
 * Utilitários gerais para o gerador de provas e listas.
 */

/**
 * Normaliza texto para comparação.
 * @param {string} texto Texto de entrada.
 * @returns {string}
 */
function normalizarTexto(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Embaralha um array usando Fisher-Yates.
 * @param {Array<any>} arr Array de entrada.
 * @returns {Array<any>}
 */
function embaralhar(arr) {
  const copia = [].concat(arr || []);
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
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
 * Substitui tags [[VAR]] por valores já calculados.
 * @param {string} template Texto com tags.
 * @param {Object} vars Variáveis da instância.
 * @returns {string}
 */
function aplicarTemplate(template, vars) {
  return String(template || '').replace(/\[\[([A-Za-z0-9_]+)\]\]/g, (match, tag) => {
    if (typeof vars[tag] !== 'undefined') {
      return limparMatematica(String(vars[tag]));
    }
    return match;
  });
}

/**
 * Busca questões em um banco.
 * @param {string} idBanco ID da planilha do banco.
 * @param {string} nivel Filtro de nível.
 * @param {string} tipo Filtro de tipo.
 * @param {number} qtd Quantidade de questões.
 * @returns {Array<Object>}
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
 * Interpreta regras de variáveis.
 * @param {string} regras Regras separadas por ponto e vírgula.
 * @returns {Object}
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
      const comTagsSubstituidas = expr.replace(/\[\[([A-Za-z0-9_]+)\]\]/g, (matchTag, tag) => {
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
 * Verifica se a questão é de múltipla escolha.
 * @param {string} tipo Tipo da questão.
 * @returns {boolean}
 */
function isMultipla(tipo) {
  const texto = normalizarTexto(tipo);
  return texto.includes('multipla') || texto.includes('múltipla');
}

/**
 * Monta as alternativas com embaralhamento e resposta correta.
 * @param {Object} q Questão.
 * @param {Object} vars Variáveis resolvidas.
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
 * Salva um arquivo .tex no Drive.
 * @param {string} nome Nome do arquivo.
 * @param {string} conteudo Conteúdo LaTeX.
 * @returns {GoogleAppsScript.Drive.File}
 */
function salvarArquivoTex(nome, conteudo) {
  const pasta = DESTINO_RAIZ ? DriveApp.getRootFolder() : DriveApp.getFolderById(PASTA_DESTINO_ID);
  const blob = Utilities.newBlob(conteudo, 'application/x-tex', nome);
  return pasta.createFile(blob);
}
