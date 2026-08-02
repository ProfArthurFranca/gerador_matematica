/**
 * Orquestração principal do gerador.
 */

const PLANILHA_PRINCIPAL = 'Gerador_Matemática';
const ABA_CONTROLE = 'Controle';
const ABA_GERADOR = 'Gerador';
const DESTINO_RAIZ = true;
const PASTA_DESTINO_ID = '';

/**
 * Função principal de entrada do gerador.
 * @returns {Array<Object>} Objeto com URLs dos arquivos gerados.
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
 * Função de teste para depuração.
 */
function testeGerarTex() {
  Logger.log(JSON.stringify(gerarTex()));
}
