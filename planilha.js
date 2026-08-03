
function ler_gerador(aba_controle, aba_gerador) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const controleSheet = ss.getSheetByName(ABA_CONTROLE);
  const geradorSheet = ss.getSheetByName(ABA_GERADOR);

  let controle = {
    tipo: controleSheet.getRange('A2').getValue(),
    quantidade_documento: controleSheet.getRange('B2').getValue(),
    titulo: controleSheet.getRange('C2').getValue(),
  }

  let gerador = geradorSheet.getDataRange().getValues();

  return {
    controle: controle,
    gerador: gerador
  }
}

function ler_banco(idBanco, nivel, qtd, tipo) {
  // Acessa a planilha e pega todos os dados
  const ss = SpreadsheetApp.openById(idBanco);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  
  // Remove a primeira linha (cabeçalho) para não processá-la como questão
  const dados = values.slice(1);
  
  // 1. Filtra as questões que correspondem ao nível desejado
  const questoesFiltradas = embaralhar_lista(dados.filter(linha => {
    return String(linha[1] || '').trim() === nivel;
  }));
  
  // 2. Pega apenas a quantidade solicitada (ou o máximo disponível)
  const questoesLimitadas = questoesFiltradas.slice(0, qtd);
  
  // 3. Mapeia as linhas para o formato de objeto especificado
  const resultado = questoesLimitadas.map(linha => {
    
    // Lida com a regra do tipo 'aberta' para os distratores
    let distratores = String(linha[6] || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
      
    if (tipo === 'aberta') {
      distratores = [];
    }

    return {
      idQuestao: String(linha[0] || '').trim(),
      nivel: String(linha[1] || '').trim(),
      enunciado: String(linha[2] || '').trim(),
      imagem: String(linha[3] || '').trim(),
      variaveis: String(linha[4] || '').trim(),
      resposta: String(linha[5] || '').trim(),
      distratores: distratores
    };
  });
  
  return resultado;
}
