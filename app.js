// Interface da página: menu, horário, roda de setores, ofício e envio pelo WhatsApp.
(function () {
  'use strict';

  const cfg = window.EL_CONFIG;
  const P = window.ElPedido;
  if (!cfg || !P) return;

  const $ = seletor => document.querySelector(seletor);
  const SVG = 'http://www.w3.org/2000/svg';
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Botões de conversa geral.
  const linkGeral = P.linkWhatsApp(cfg.whatsapp, 'Olá! Vim pelo site da EL Produções de Software e gostaria de falar sobre os sistemas de gestão pública.');
  document.querySelectorAll('[data-wa]').forEach(a => { a.href = linkGeral; });

  // Menu do celular.
  const menu = $('#menu');
  const menuBotao = $('.menu-botao');
  function fecharMenu() {
    menu.classList.remove('aberto');
    menuBotao.setAttribute('aria-expanded', 'false');
  }
  menuBotao.addEventListener('click', () => {
    const abrir = !menu.classList.contains('aberto');
    menu.classList.toggle('aberto', abrir);
    menuBotao.setAttribute('aria-expanded', String(abrir));
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) fecharMenu(); });
  document.addEventListener('click', e => {
    if (menu.classList.contains('aberto') && !e.target.closest('.topo')) fecharMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('aberto')) { fecharMenu(); menuBotao.focus(); }
  });

  // Luz de atendimento.
  const luz = $('#luz');
  function atualizarLuz() {
    const agora = P.agoraNaSede(new Date());
    const situacao = P.situacaoHorario(agora.dia, agora.hora, agora.minuto, cfg.horario);
    luz.classList.toggle('aberto', situacao.aberto);
    $('#luz-texto').textContent = situacao.texto;
    luz.hidden = false;
  }
  atualizarLuz();
  setInterval(atualizarLuz, 60000);

  // Estado do pedido.
  const estado = { orgao: 'prefeitura', marcados: new Set(), fios: new Set() };
  const setoresCaixa = $('#setores');
  const roda = $('#roda');
  const local = $('#campo-local');
  const cargo = $('#campo-cargo');
  const formatos = $('#formatos');
  const resultado = $('#resultado');
  const erro = $('#oficio-erro');
  const protocolar = $('#protocolar');

  for (const [valor, nome] of Object.entries(P.CARGOS)) {
    cargo.append(new Option(nome, valor));
  }
  Object.entries(P.FORMATOS).forEach(([valor, formato], i) => {
    const rotulo = document.createElement('label');
    rotulo.className = 'formato';
    const entrada = document.createElement('input');
    Object.assign(entrada, { type: 'radio', name: 'formato', value: valor, checked: i === 0 });
    rotulo.append(entrada, document.createTextNode(formato.nome));
    formatos.append(rotulo);
  });

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function desmontarPedido() {
    if (resultado.hidden) return;
    resultado.hidden = true;
    $('#oficio-numero').textContent = 'Nº EL______-____';
  }

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.hidden = !texto;
  }

  function renderSetores() {
    setoresCaixa.textContent = '';
    for (const chave of P.setoresDe(estado.orgao)) {
      const setor = P.SETORES[chave];
      const rotulo = document.createElement('label');
      rotulo.className = 'setor';
      const caixa = document.createElement('input');
      Object.assign(caixa, { type: 'checkbox', name: 'setor', value: chave, checked: estado.marcados.has(chave) });
      const nome = document.createElement('span');
      nome.className = 'setor-nome';
      nome.textContent = setor.nome;
      const detalhe = document.createElement('span');
      detalhe.className = 'setor-detalhe';
      detalhe.textContent = setor.detalhe;
      rotulo.append(caixa, nome, detalhe);
      setoresCaixa.append(rotulo);
    }
  }

  function el(nome, atributos, pai) {
    const no = document.createElementNS(SVG, nome);
    for (const [k, v] of Object.entries(atributos)) no.setAttribute(k, v);
    if (pai) pai.append(no);
    return no;
  }

  // Roda: setores do órgão em círculo, ligações curvas entre os marcados que trocam informação.
  // Em telas estreitas a roda encolhe para os nomes ficarem legíveis.
  const AMPLA = { largura: 600, altura: 440, cx: 300, cy: 220, raio: 150, no: 15, centro: 44 };
  const COMPACTA = { largura: 480, altura: 380, cx: 240, cy: 190, raio: 90, no: 13, centro: 34 };
  let G = AMPLA;
  function escolherGeometria() {
    const nova = roda.clientWidth && roda.clientWidth < 520 ? COMPACTA : AMPLA;
    const mudou = nova !== G;
    G = nova;
    roda.setAttribute('viewBox', `0 0 ${G.largura} ${G.altura}`);
    roda.classList.toggle('compacta', G === COMPACTA);
    return mudou;
  }
  function posicoes(lista) {
    const mapa = {};
    lista.forEach((chave, i) => {
      const angulo = (-90 + i * 360 / lista.length) * Math.PI / 180;
      mapa[chave] = { x: G.cx + G.raio * Math.cos(angulo), y: G.cy + G.raio * Math.sin(angulo), cos: Math.cos(angulo), sin: Math.sin(angulo) };
    });
    return mapa;
  }

  function renderRoda(conexoes) {
    const lista = P.setoresDe(estado.orgao);
    const pos = posicoes(lista);
    roda.textContent = '';
    el('circle', { class: 'aro', cx: G.cx, cy: G.cy, r: G.raio }, roda);
    for (const chave of estado.marcados) {
      const p = pos[chave];
      el('line', { class: 'raio', x1: p.x, y1: p.y, x2: G.cx + G.centro * p.cos, y2: G.cy + G.centro * p.sin }, roda);
    }
    const fiosAgora = new Set();
    for (const c of conexoes) {
      const a = pos[c.a], b = pos[c.b];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const qx = G.cx + (mx - G.cx) * 0.25, qy = G.cy + (my - G.cy) * 0.25;
      const fio = el('path', { class: 'fio', d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}` }, roda);
      const chave = c.a + '|' + c.b;
      fiosAgora.add(chave);
      if (!estado.fios.has(chave) && !reduzir) {
        fio.style.setProperty('--comprimento', Math.ceil(fio.getTotalLength()));
        fio.classList.add('novo');
      }
    }
    estado.fios = fiosAgora;
    const centro = el('g', { class: 'centro' }, roda);
    el('circle', { cx: G.cx, cy: G.cy, r: G.centro }, centro);
    el('text', { x: G.cx, y: G.cy - 3 }, centro).textContent = 'BASE';
    el('text', { x: G.cx, y: G.cy + 13 }, centro).textContent = 'ÚNICA';
    for (const chave of lista) {
      const p = pos[chave];
      const g = el('g', { class: 'no' + (estado.marcados.has(chave) ? ' marcado' : ''), 'data-setor': chave }, roda);
      el('circle', { cx: p.x, cy: p.y, r: G.no }, g);
      const folga = G.no + 10;
      let x = p.x + folga * p.cos, y = p.y + folga * p.sin + 5, ancora = 'middle';
      if (p.cos > 0.12) ancora = 'start';
      else if (p.cos < -0.12) ancora = 'end';
      if (p.sin < -0.8) y = p.y - folga;
      else if (p.sin > 0.8) y = p.y + folga + 11;
      const texto = el('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': ancora }, g);
      texto.textContent = P.SETORES[chave].curto || P.SETORES[chave].nome;
    }
  }

  let conexoesAntes = new Set();
  function renderOficio(conexoes) {
    $('#oficio-orgao').textContent = P.ORGAOS[estado.orgao].nome;
    const ordem = P.setoresDe(estado.orgao).filter(s => estado.marcados.has(s));
    const listaSetores = $('#oficio-setores');
    listaSetores.textContent = '';
    for (const s of ordem) {
      const li = document.createElement('li');
      li.textContent = P.SETORES[s].nome;
      listaSetores.append(li);
    }
    $('#setores-vazio').hidden = ordem.length > 0;
    const listaConexoes = $('#oficio-conexoes');
    listaConexoes.textContent = '';
    const agora = new Set();
    for (const c of conexoes) {
      const li = document.createElement('li');
      li.textContent = c.texto;
      if (!conexoesAntes.has(c.texto) && !reduzir) li.className = 'novo';
      agora.add(c.texto);
      listaConexoes.append(li);
    }
    conexoesAntes = agora;
    $('#conexoes-vazio').hidden = conexoes.length > 0;
    $('#contagem').textContent = ordem.length === 0
      ? 'Nenhum setor marcado'
      : `${plural(ordem.length, 'setor marcado', 'setores marcados')}, ${plural(conexoes.length, 'ligação', 'ligações')}`;
  }

  function atualizar() {
    const conexoes = P.conexoesEntre([...estado.marcados]);
    renderRoda(conexoes);
    renderOficio(conexoes);
  }

  function escolherOrgao(valor) {
    estado.orgao = valor;
    const permitidos = new Set(P.setoresDe(valor));
    for (const s of [...estado.marcados]) if (!permitidos.has(s)) estado.marcados.delete(s);
    estado.fios = new Set();
    desmontarPedido();
    renderSetores();
    atualizar();
  }

  function alternar(chave, marcar) {
    if (marcar) estado.marcados.add(chave); else estado.marcados.delete(chave);
    mostrarErro('');
    desmontarPedido();
    atualizar();
  }

  document.querySelectorAll('input[name="orgao"]').forEach(r => {
    r.addEventListener('change', () => { if (r.checked) escolherOrgao(r.value); });
  });

  setoresCaixa.addEventListener('change', e => {
    if (e.target.name === 'setor') alternar(e.target.value, e.target.checked);
  });

  roda.addEventListener('click', e => {
    const no = e.target.closest('.no');
    if (!no) return;
    const caixa = setoresCaixa.querySelector(`input[value="${no.dataset.setor}"]`);
    caixa.checked = !caixa.checked;
    alternar(caixa.value, caixa.checked);
  });

  $('#marcar-todos').addEventListener('click', () => {
    P.setoresDe(estado.orgao).forEach(s => estado.marcados.add(s));
    setoresCaixa.querySelectorAll('input').forEach(c => { c.checked = true; });
    mostrarErro('');
    desmontarPedido();
    atualizar();
  });

  $('#limpar').addEventListener('click', () => {
    estado.marcados.clear();
    setoresCaixa.querySelectorAll('input').forEach(c => { c.checked = false; });
    desmontarPedido();
    atualizar();
  });

  local.addEventListener('input', desmontarPedido);
  cargo.addEventListener('change', desmontarPedido);
  formatos.addEventListener('change', desmontarPedido);

  // As pastas de "Para quem" abrem o pedido já no tipo de órgão.
  document.querySelectorAll('[data-orgao]').forEach(link => {
    link.addEventListener('click', () => {
      const radio = document.querySelector(`input[name="orgao"][value="${link.dataset.orgao}"]`);
      radio.checked = true;
      escolherOrgao(radio.value);
    });
  });

  protocolar.addEventListener('click', () => {
    let pedido;
    try {
      pedido = P.montar({
        orgao: estado.orgao,
        setores: [...estado.marcados],
        formato: (formatos.querySelector('input:checked') || {}).value,
        cargo: cargo.value,
        local: local.value,
      }, new Date());
    } catch (falha) {
      if (/setor/.test(falha.message)) {
        mostrarErro('Marque pelo menos um setor na roda ou na lista para protocolar o pedido.');
        const primeiro = setoresCaixa.querySelector('input');
        if (primeiro) primeiro.focus();
      } else {
        mostrarErro('Escolha o formato da apresentação para protocolar o pedido.');
      }
      return;
    }
    mostrarErro('');
    $('#oficio-numero').textContent = 'Nº ' + pedido.numero;
    $('#carimbo-numero').textContent = pedido.numero;
    $('#carimbo-data').textContent = pedido.carimbo;
    $('#enviar').href = P.linkWhatsApp(cfg.whatsapp, P.mensagem(pedido));
    resultado.hidden = false;
    const carimbo = $('#carimbo');
    carimbo.classList.remove('batendo');
    void carimbo.offsetWidth;
    carimbo.classList.add('batendo');
    $('#pronto').focus({ preventScroll: true });
    resultado.scrollIntoView({ block: 'nearest', behavior: reduzir ? 'auto' : 'smooth' });
  });

  let espera;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => { if (escolherGeometria()) { estado.fios = new Set(); atualizar(); } }, 150);
  });

  protocolar.disabled = false;
  escolherGeometria();
  renderSetores();
  atualizar();
})();
