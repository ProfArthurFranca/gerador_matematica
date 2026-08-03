
function embaralhar_lista(arr) {
  const copia = [].concat(arr || []);
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}


function sortear_valores(variaveis) {
  const resultado = {};
  const partes = variaveis
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const parte of partes) {
    const [chave, valorRaw] = parte.split(':');
    const nome = chave.trim();
    const valor = (valorRaw || '').trim();

    if (!nome || !valor) continue;

    if (valor.startsWith('[') && valor.endsWith(']')) {
      const lista = valor
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim());

      resultado[nome] = lista[Math.floor(Math.random() * lista.length)];
    } else {
      const match = valor.match(/^(\d+)-(\d+)(?:\[(\d+)\])?$/);
      if (match) {
        const inicio = Number(match[1]);
        const fim = Number(match[2]);
        const passo = Number(match[3] || 1);

        const valores = [];
        for (let v = inicio; v <= fim; v += passo) {
          valores.push(v);
        }

        resultado[nome] = valores[Math.floor(Math.random() * valores.length)];
      }
    }
  }

  return resultado;
}


function limpar_matematica(texto) {
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


function aplicar_valores(template, valores) {
  return limpar_matematica(template.replace(/\[\[([^\]]+)\]\]/g, (_, nome) => {
    return valores[nome] !== undefined ? String(valores[nome]) : '';
  }));
}

