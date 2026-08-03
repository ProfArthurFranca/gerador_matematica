
const ABA_CONTROLE = 'Controle';
const ABA_GERADOR = 'Gerador';



function main() {
  let { controle, gerador } = ler_gerador(ABA_CONTROLE, ABA_GERADOR);

  let documentLatex = criar_preambulo();
  let gabaritoLatex = criar_preambulo();


  //Loop na quantidade de dcoumentos que serão gerados
  for (let i = 0; i < controle.quantidade_documento; i++) {
    let sequencial = i + 1;
    let questoes = [];

    //loop nas quantidades de questões e assuntos por documento
    for (let j = 0; j < gerador.length; j++) { 
      let linha_gerador = {
        idBanco: gerador[j][1],
        quantidade_questao: gerador[j][2],
        nivel: gerador[j][3],
        tipo_questao: gerador[j][4]
      }

      questoes = questoes.concat(
        ler_banco(linha_gerador.idBanco, linha_gerador.nivel, linha_gerador.quantidade_questao, linha_gerador.tipo_questao)
      );
    }

    //sortear e aplicar as variáveis para cada questão
    let questoes_aplicadas = questoes.map((questao) => {
      let valores = sortear_valores(questao.variaveis);
      let enunciado = aplicar_valores(questao.enunciado, valores);
      let imagem = aplicar_valores(questao.imagem, valores);
      let resposta = aplicar_valores(questao.resposta, valores);
      resposta = resolver(resposta);
      let alternativas = questao.tipo == 'aberta' ? [] : questao.distratores.map((d) => resolver(aplicar_valores(d, valores)));
      alternativas = [...alternativas, resposta];
      alternativas = embaralhar_lista(alternativas);
    });

    //gerar os documentos em Latex
    let { documentLatex: docLatex, gabaritoLatex: gabLatex } = gerar_documento(questoes, controle.titulo, sequencial);
    documentLatex += docLatex;
    gabaritoLatex += gabLatex;

    // Só adiciona a nova página se NÃO for a última prova/lista
    if (i < controle.quantidade_documento - 1) {
      documentLatex += '\\newpage\n';
      gabaritoLatex += '\\newpage\n';
    }
  }

  documentLatex += '\\end{document}\n';
  gabaritoLatex += '\\end{document}\n';

  criar_tex(documentLatex, controle.titulo);
  criar_tex(gabaritoLatex, controle.titulo + ' - Gabarito');

}