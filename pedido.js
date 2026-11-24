// Regras do pedido de apresentação: órgãos, setores, conexões entre setores, número do protocolo, mensagem do WhatsApp e horário.
(function (raiz) {
  'use strict';

  // Ordem fixa: é a ordem dos setores na roda e na lista.
  const SETORES = Object.freeze({
    tributario: { nome: 'Tributário', detalhe: 'cadastro de contribuintes, impostos, taxas e dívida ativa' },
    contabilidade: { nome: 'Contabilidade', detalhe: 'orçamento, empenho, liquidação, pagamento e prestação de contas' },
    rh: { nome: 'Recursos Humanos', curto: 'RH', detalhe: 'cadastro de servidores, folha de pagamento, férias e licenças' },
    previdencia: { nome: 'Previdência', detalhe: 'segurados, contribuições, aposentadorias e pensões do regime próprio' },
    compras: { nome: 'Compras', detalhe: 'pedidos, licitações, atas e contratos' },
    almoxarifado: { nome: 'Almoxarifado', detalhe: 'entrada e saída de material, estoque por unidade' },
    patrimonio: { nome: 'Patrimônio', detalhe: 'tombamento, transferência, inventário e depreciação de bens' },
    frotas: { nome: 'Frotas', detalhe: 'veículos, motoristas, abastecimento e manutenção' },
    protocolo: { nome: 'Protocolo', detalhe: 'abertura e tramitação de processos e requerimentos' },
    transparencia: { nome: 'Transparência', detalhe: 'publicação de receitas, despesas, folha, licitações e contratos' },
    saude: { nome: 'Saúde', detalhe: 'unidades, atendimentos e controle de medicamentos' },
    educacao: { nome: 'Educação', detalhe: 'escolas, matrículas, lotação de professores e merenda' },
  });

  const ORGAOS = Object.freeze({
    prefeitura: {
      nome: 'Prefeitura',
      setores: ['tributario', 'contabilidade', 'rh', 'compras', 'almoxarifado', 'patrimonio', 'frotas', 'protocolo', 'transparencia', 'saude', 'educacao'],
    },
    camara: {
      nome: 'Câmara municipal',
      setores: ['contabilidade', 'rh', 'compras', 'almoxarifado', 'patrimonio', 'frotas', 'protocolo', 'transparencia'],
    },
    instituto: {
      nome: 'Instituto de previdência',
      setores: ['previdencia', 'contabilidade', 'rh', 'compras', 'almoxarifado', 'patrimonio', 'protocolo', 'transparencia'],
    },
    outro: {
      nome: 'Outro órgão público',
      setores: Object.keys(SETORES),
    },
  });

  // Informação que passa de um setor para o outro sem ser digitada de novo.
  const c = (a, b, texto) => Object.freeze({ a, b, texto });
  const CONEXOES = Object.freeze([
    c('rh', 'contabilidade', 'A folha fechada no RH chega à contabilidade pronta para empenho e pagamento.'),
    c('tributario', 'contabilidade', 'O que o tributário arrecada entra como receita na contabilidade.'),
    c('compras', 'contabilidade', 'A compra aprovada vira empenho com fornecedor e valor já preenchidos.'),
    c('compras', 'almoxarifado', 'O material comprado dá entrada no almoxarifado pela própria ordem de compra.'),
    c('compras', 'patrimonio', 'Móveis e equipamentos comprados são tombados no patrimônio com nota e valor.'),
    c('patrimonio', 'contabilidade', 'A depreciação dos bens chega à contabilidade sem planilha à parte.'),
    c('almoxarifado', 'frotas', 'Combustível e peças que saem do estoque ficam lançados no veículo que os usou.'),
    c('frotas', 'patrimonio', 'Cada veículo da frota usa o mesmo cadastro do bem no patrimônio.'),
    c('rh', 'previdencia', 'Servidores e contribuições da folha alimentam o cadastro de segurados.'),
    c('previdencia', 'contabilidade', 'Aposentadorias e pensões pagas entram como despesa na contabilidade.'),
    c('protocolo', 'tributario', 'O pedido do contribuinte aberto no protocolo segue para o tributário com o cadastro dele.'),
    c('protocolo', 'rh', 'Requerimentos de férias e licenças tramitam do protocolo para o RH.'),
    c('contabilidade', 'transparencia', 'Receitas e despesas lançadas na contabilidade aparecem no portal da transparência.'),
    c('rh', 'transparencia', 'Cargos e remunerações saem da folha para o portal da transparência.'),
    c('compras', 'transparencia', 'Licitações e contratos ficam publicados no portal da transparência.'),
    c('saude', 'almoxarifado', 'Medicamentos e insumos das unidades de saúde saem do estoque do almoxarifado.'),
    c('educacao', 'almoxarifado', 'Merenda e material escolar são controlados no mesmo estoque.'),
    c('saude', 'frotas', 'O transporte de pacientes usa os veículos e motoristas cadastrados na frota.'),
    c('educacao', 'frotas', 'O transporte escolar usa os veículos e motoristas cadastrados na frota.'),
    c('educacao', 'rh', 'A lotação de professores nas escolas usa o cadastro de servidores do RH.'),
  ]);

  const CARGOS = Object.freeze({
    prefeito: 'Prefeito(a) ou vice',
    secretario: 'Secretário(a)',
    presidente: 'Presidente da câmara',
    diretor: 'Diretor(a) de instituto',
    controle: 'Controle interno',
    servidor: 'Servidor(a) da área',
    outro: 'Outro cargo',
  });

  const FORMATOS = Object.freeze({
    online: { nome: 'Apresentação on-line', fecho: 'Podemos marcar uma data para a apresentação on-line?' },
    orgao: { nome: 'Visita da equipe ao órgão', fecho: 'Podemos combinar uma data para a visita?' },
    sede: { nome: 'Visita à sede em Domingos Martins', fecho: 'Podemos combinar uma data para irmos até a sede?' },
  });

  // Setores que o tipo de órgão pode marcar, na ordem da roda.
  function setoresDe(orgao) {
    const o = ORGAOS[orgao];
    if (!o) throw new Error('Órgão inválido');
    return o.setores.slice();
  }

  // Conexões cujos dois lados estão marcados.
  function conexoesEntre(marcados) {
    const conjunto = new Set(marcados);
    return CONEXOES.filter(x => conjunto.has(x.a) && conjunto.has(x.b));
  }

  const doisDigitos = n => String(n).padStart(2, '0');

  // ELAAMMDD-HHMM, com a hora local de quem preencheu.
  function numeroPedido(data) {
    const dia = String(data.getFullYear()).slice(2) + doisDigitos(data.getMonth() + 1) + doisDigitos(data.getDate());
    return 'EL' + dia + '-' + doisDigitos(data.getHours()) + doisDigitos(data.getMinutes());
  }

  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // Data do carimbo: 23 NOV 2026 15:30.
  function dataCarimbo(data) {
    return `${doisDigitos(data.getDate())} ${MESES[data.getMonth()]} ${data.getFullYear()} ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  }

  // Texto digitado: sem caracteres de controle, espaços simples e no máximo 60 caracteres.
  function limparTexto(texto) {
    return String(texto || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  }

  // Confere as escolhas e devolve o pedido completo.
  function montar(escolha, data) {
    const orgao = ORGAOS[escolha.orgao];
    if (!orgao) throw new Error('Órgão inválido');
    const marcados = Array.from(new Set(escolha.setores || []));
    if (marcados.length === 0) throw new Error('Marque pelo menos um setor');
    for (const s of marcados) {
      if (!orgao.setores.includes(s)) throw new Error('Setor inválido para este órgão');
    }
    const formato = FORMATOS[escolha.formato];
    if (!formato) throw new Error('Formato inválido');
    if (escolha.cargo && !CARGOS[escolha.cargo]) throw new Error('Cargo inválido');
    const ordenados = orgao.setores.filter(s => marcados.includes(s));
    return {
      numero: numeroPedido(data),
      carimbo: dataCarimbo(data),
      orgao: orgao.nome,
      local: limparTexto(escolha.local),
      cargo: escolha.cargo ? CARGOS[escolha.cargo] : '',
      setores: ordenados.map(s => SETORES[s].nome),
      conexoes: conexoesEntre(ordenados).map(x => x.texto),
      formato: formato.nome,
      fecho: formato.fecho,
    };
  }

  function mensagem(pedido) {
    const orgao = pedido.local ? `${pedido.orgao} (${pedido.local})` : pedido.orgao;
    const linhas = [
      'Olá! Vim pelo site da E&L Produções de Software.',
      'Pedido de apresentação ' + pedido.numero,
      'Órgão: ' + orgao,
    ];
    if (pedido.cargo) linhas.push('Cargo: ' + pedido.cargo);
    linhas.push('Setores: ' + pedido.setores.join(', '));
    linhas.push('Formato: ' + pedido.formato);
    linhas.push(pedido.fecho);
    return linhas.join('\n');
  }

  function linkWhatsApp(numero, texto) {
    if (!/^55\d{10,11}$/.test(numero)) throw new Error('Número de WhatsApp inválido');
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // horario: { 1: [8, 18], ... } com o dia da semana (0 = domingo) e as horas de abrir e fechar.
  function situacaoHorario(dia, hora, minuto, horario) {
    const agora = hora + minuto / 60;
    const hoje = horario[dia];
    if (hoje && agora >= hoje[0] && agora < hoje[1]) {
      return { aberto: true, texto: `Atendendo agora, até as ${hoje[1]}h` };
    }
    if (hoje && agora < hoje[0]) return { aberto: false, texto: `Fora do horário, volta hoje às ${hoje[0]}h` };
    for (let i = 1; i <= 7; i++) {
      const proximo = (dia + i) % 7;
      const faixa = horario[proximo];
      if (!faixa) continue;
      const quando = i === 1 ? 'amanhã' : DIAS[proximo];
      return { aberto: false, texto: `Fora do horário, volta ${quando} às ${faixa[0]}h` };
    }
    return { aberto: false, texto: 'Fora do horário' };
  }

  // Dia e hora em Domingos Martins (horário de Brasília), qualquer que seja o fuso de quem abre a página.
  function agoraNaSede(data) {
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(data);
    const valor = tipo => partes.find(p => p.type === tipo).value;
    return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valor('weekday')), hora: Number(valor('hour')), minuto: Number(valor('minute')) };
  }

  raiz.ElPedido = Object.freeze({ SETORES, ORGAOS, CONEXOES, CARGOS, FORMATOS, setoresDe, conexoesEntre, numeroPedido, dataCarimbo, limparTexto, montar, mensagem, linkWhatsApp, situacaoHorario, agoraNaSede });
})(globalThis);
