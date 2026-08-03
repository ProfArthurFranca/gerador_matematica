
function criar_preambulo() {
  return `
  \\documentclass[12pt]{article}
  \\usepackage[utf8]{inputenc}
  \\usepackage[brazil]{babel}
  \\usepackage[margin=1.5cm]{geometry}
  \\usepackage{amsmath,amssymb}
  \\usepackage{tikz}
  \\usepackage{graphicx}
  \\usepackage{geometry}
  \\usepackage{enumitem}
  \\pagenumbering{gobble}
  \\pagestyle{empty}
  \\begin{document}
  `
}

function criar_cabecalho(titulo, sequencial) {
  let tituloEscapado = escapeLatex(titulo);

  return `
    \\begin{center}
    \\begin{tikzpicture}[x=1cm,y=1cm]
     % --------------------------------------------------
    % Logos
    % --------------------------------------------------
    \\node[anchor=west] at (0, 0.2)
      {\\includegraphics[height=2.3cm]{Logo/logo_colegio.png}};

    \\node[anchor=east] at (18.8, 0.2)
      {\\includegraphics[height=1.8cm]{Logo/logo_pitagoras.png}};

    % --------------------------------------------------
    % Título (Elevado)
    % --------------------------------------------------
    \\node[font=\\Large] at (9.4, 1.75)
      {\\textbf{${tituloEscapado}}};
    
    % --------------------------------------------------
    % Caixa Nome do Aluno
    % --------------------------------------------------
    \\draw[rounded corners=2mm] (3.0, 0.55) rectangle (16.5, 1.15);
    \\node[font=\\bfseries\\small, anchor=west] at (3.2, 0.85) {Nome:};

    % --------------------------------------------------
    % Caixa Data
    % --------------------------------------------------
    \\draw[rounded corners=2mm] (3.0, -0.2) rectangle (6.8, 0.4);
    \\node[font=\\bfseries\\small] at (3.7, 0.1) {Data:};
    \\node[font=\\small] at (5.3, 0.1) {\\_\\_\\_/\\_\\_\\_/\\_\\_\\_};

    % --------------------------------------------------
    % Caixa Professor
    % --------------------------------------------------
    \\draw[rounded corners=2mm] (7.3, -0.2) rectangle (13.2, 0.4);
    \\node[font=\\bfseries\\small] at (8.4, 0.1) {Prof.:};
    \\node[font=\\small] at (10.8, 0.1) {Arthur França};

    % --------------------------------------------------
    % Caixa Sequencial (Seq: XX)
    % --------------------------------------------------
    \\draw[rounded corners=2mm] (13.7, -0.2) rectangle (16.5, 0.4);
    \\node[font=\\bfseries\\small] at (15.1, 0.1) {Seq: ${sequencial}}; 
    \\end{tikzpicture}
    \\end{center}
    \\vspace{0.2cm}
  `
}

function criar_questao(enunciado, imagem, alternativas=[] ) {
  let enunciadoEscapado = escapeLatex(enunciado);
  let imagemLatex = imagem ? `${imagem}` : '';

  let alternativasLatex;

  if (!alternativas || alternativas.length === 0) {
    alternativasLatex = '\\vspace{1.5cm}';
  } else {
    const itens = alternativas
      .map((alt) => `\\item ${escapeLatex(alt)}`)
      .join('\n');

    alternativasLatex = `\\begin{enumerate}[label=\\alph*)]\n${itens}\n\\end{enumerate}`;
  }

  return `
  \\item ${enunciadoEscapado} \n
  ${imagemLatex} \n
  ${alternativasLatex} \n
  `;
}


function criar_cabecalho_gabarito(titulo, sequencial) {
  let tituloEscapado = escapeLatex(titulo);

  return `
    \\begin{center}
    {\\Large\\bfseries GABARITO — ${tituloEscapado}}\\\\[3pt]
    {\\large \\textbf{Sequência:} ${sequencial}}
    \\end{center}
    \\hrule\n\\vspace{0.3cm}
  `
}

function criar_gabarito(resposta) {
  return `\\item ${escapeLatex(resposta)} \n`;
}

function gerar_documento(questoes, titulo, sequencial) {
  let documentLatex = criar_cabecalho(titulo, sequencial);
  let gabaritoLatex = criar_cabecalho_gabarito(titulo, sequencial);

  documentLatex += '\\begin{enumerate}\n';
  gabaritoLatex += '\\begin{enumerate}\n';

  for (let questao in questoes) {
    documentLatex += criar_questao(questao.enunciado, questao.imagem, questao.alternativas);
    gabaritoLatex += criar_gabarito(questao.resposta);
  }

  documentLatex += '\\end{enumerate}\n';
  gabaritoLatex += '\\end{enumerate}\n';

  return { documentLatex, gabaritoLatex };
}

function criar_tex(conteudo_latex, nome_arquivo) {
  // 1. Garante que o nome termine com a extensão .tex
  if (!nomeArquivo.endsWith('.tex')) {
    nomeArquivo += '.tex';
  }

  // 2. Obtém a planilha ativa e seu ID
  const planilhaAtiva = SpreadsheetApp.getActiveSpreadsheet();
  const idPlanilha = planilhaAtiva.getId();

  // 3. Pega o arquivo da planilha no Drive e localiza suas pastas pai
  const arquivoNoDrive = DriveApp.getFileById(idPlanilha);
  const pastasPai = arquivoNoDrive.getParents();

  // 4. Se a planilha estiver dentro de uma pasta, usa ela. Caso contrário, usa a raiz do Drive
  let pastaDestino;
  if (pastasPai.hasNext()) {
    pastaDestino = pastasPai.next();
  } else {
    pastaDestino = DriveApp.getRootFolder();
  }

  // 5. Cria o arquivo na pasta destino com o conteúdo e o tipo MIME corretos (texto puro)
  pastaDestino.createFile(nome_arquivo, conteudo_latex, MimeType.PLAIN_TEXT);
}
