/**
 * Orquestração principal do gerador.
 */

var PLANILHA_PRINCIPAL = 'Gerador_Matemática';
var ABA_CONTROLE = 'Controle';
var ABA_GERADOR = 'Gerador';
var DESTINO_RAIZ = true;
var PASTA_DESTINO_ID = '';

/**
 * Função principal de entrada do gerador.
 * @returns {Array<Object>} Objeto com URLs dos arquivos gerados.
 */
function gerarTex() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configControle = obterDadosControle(ss);
  var listaRequisitosGerador = obterRequisitosGerador(ss);

  var resultados = [];

  for (var i = 0; i < configControle.length; i += 1) {
    var item = configControle[i];
    var tipo = String(item.tipo || '').trim();
    var quantidade = Math.max(1, Number(item.quantidade || 1));
    var nomeBase = String(item.nomeArquivo || '').trim();

    if (!nomeBase) {
      continue;
    }

    var versoesAluno = [];
    var versoesGabarito = [];

    for (var v = 0; v < quantidade; v += 1) {
      var bloco = gerarVersao(listaRequisitosGerador, v + 1);
      versoesAluno.push(bloco.aluno);
      versoesGabarito.push(bloco.gabarito);
    }

    var texAluno = [
      criarPreambuloLatex(),
      criarCabecalho(tipo, nomeBase, v + 1),
      versoesAluno.join('\n\n\\newpage\n\n'),
      '\\end{document}'
    ].join('\n\n');

    var texGabarito = [
      criarPreambuloLatex(),
      criarCabecalhoGabarito(nomeBase, v + 1),
      versoesGabarito.join('\n\n\\newpage\n\n'),
      '\\end{document}'
    ].join('\n\n');

    var arquivoAluno = salvarArquivoTex(nomeBase + '.tex', texAluno);
    var arquivoGabarito = salvarArquivoTex(nomeBase + '_Gabarito.tex', texGabarito);

    resultados.push({
      tipo: tipo,
      nomeArquivo: nomeBase,
      alunoUrl: arquivoAluno && arquivoAluno.getUrl ? arquivoAluno.getUrl() : '',
      gabaritoUrl: arquivoGabarito && arquivoGabarito.getUrl ? arquivoGabarito.getUrl() : ''
    });
  }

  return resultados;
}

/**
 * Lê as configurações da aba Controle.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss Planilha ativa.
 * @returns {Array<Object>}
 */
function obterDadosControle(ss) {
  var controleSheet = ss.getSheetByName(ABA_CONTROLE);
  if (!controleSheet) {
    throw new Error('Aba "Controle" não encontrada.');
  }

  var controleValues = controleSheet.getDataRange().getValues();
  return controleValues.slice(1)
    .map(function (linha) {
      return {
        tipo: linha[0] || '',
        quantidade: Number(linha[1] || 1),
        nomeArquivo: linha[2] || ''
      };
    })
    .filter(function (row) {
      return row.tipo && row.nomeArquivo;
    });
}

/**
 * Lê os requisitos da aba Gerador.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss Planilha ativa.
 * @returns {Array<Object>}
 */
function obterRequisitosGerador(ss) {
  var geradorSheet = ss.getSheetByName(ABA_GERADOR);
  if (!geradorSheet) {
    throw new Error('Aba "Gerador" não encontrada.');
  }

  var geradorValues = geradorSheet.getDataRange().getValues();
  return geradorValues.slice(1)
    .map(function (linha) {
      return {
        conteudo: linha[0] || '',
        idBanco: linha[1] || '',
        quantidade: Number(linha[2] || 0),
        nivel: linha[3] || '',
        tipo: linha[4] || ''
      };
    })
    .filter(function (row) {
      return row.idBanco && row.quantidade > 0;
    });
}

/**
 * Função de teste para depuração.
 */
function testeGerarTex() {
  Logger.log(JSON.stringify(gerarTex()));
}
