import test from 'node:test';
import assert from 'node:assert/strict';

await import('../pedido.js');
const { SETORES, ORGAOS, CONEXOES, CARGOS, FORMATOS, setoresDe, conexoesEntre, numeroPedido, dataCarimbo, limparTexto, montar, mensagem, linkWhatsApp, situacaoHorario, agoraNaSede } = globalThis.ElPedido;

const data = new Date(2026, 10, 23, 15, 7);
const horario = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18] };
const escolha = { orgao: 'prefeitura', setores: ['contabilidade', 'rh', 'transparencia'], formato: 'online', cargo: 'secretario', local: 'Prefeitura de Venda Nova do Imigrante' };

test('número do pedido usa EL, a data com ano curto e a hora', () => {
  assert.equal(numeroPedido(data), 'EL261123-1507');
  assert.equal(numeroPedido(new Date(2027, 0, 3, 9, 5)), 'EL270103-0905');
});

test('data do carimbo vem com mês abreviado em maiúsculas', () => {
  assert.equal(dataCarimbo(data), '23 NOV 2026 15:07');
  assert.equal(dataCarimbo(new Date(2026, 1, 9, 8, 0)), '09 FEV 2026 08:00');
});

test('cada órgão só lista setores conhecidos, sem repetir', () => {
  for (const [chave, orgao] of Object.entries(ORGAOS)) {
    assert.ok(orgao.setores.length >= 8, chave + ' com poucos setores');
    assert.equal(new Set(orgao.setores).size, orgao.setores.length, chave + ' com setor repetido');
    for (const s of orgao.setores) assert.ok(SETORES[s], `${chave} com setor desconhecido: ${s}`);
  }
  assert.ok(!ORGAOS.camara.setores.includes('tributario'), 'câmara não arrecada tributos');
  assert.ok(ORGAOS.instituto.setores.includes('previdencia'));
  assert.ok(!ORGAOS.prefeitura.setores.includes('previdencia'));
});

test('setoresDe devolve uma cópia e recusa órgão desconhecido', () => {
  const lista = setoresDe('camara');
  lista.push('saude');
  assert.ok(!ORGAOS.camara.setores.includes('saude'));
  assert.throws(() => setoresDe('banco'), /Órgão inválido/);
});

test('conexões ligam setores conhecidos e não se repetem', () => {
  const vistos = new Set();
  for (const x of CONEXOES) {
    assert.ok(SETORES[x.a] && SETORES[x.b], `${x.a}-${x.b} desconhecido`);
    assert.notEqual(x.a, x.b);
    const par = [x.a, x.b].sort().join('|');
    assert.ok(!vistos.has(par), 'conexão repetida: ' + par);
    vistos.add(par);
    assert.ok(x.texto.length > 40 && x.texto.endsWith('.'));
  }
  for (const s of Object.keys(SETORES)) {
    assert.ok(CONEXOES.some(x => x.a === s || x.b === s), s + ' sem nenhuma conexão');
  }
});

test('conexoesEntre só conta conexões com os dois setores marcados', () => {
  assert.equal(conexoesEntre(['rh']).length, 0);
  const tres = conexoesEntre(['contabilidade', 'rh', 'transparencia']);
  assert.deepEqual(tres.map(x => x.a + '-' + x.b), ['rh-contabilidade', 'contabilidade-transparencia', 'rh-transparencia']);
  assert.equal(conexoesEntre(Object.keys(SETORES)).length, CONEXOES.length);
});

test('o pedido reúne órgão, setores na ordem da roda, conexões e formato', () => {
  const pedido = montar({ ...escolha, setores: ['transparencia', 'rh', 'contabilidade', 'rh'] }, data);
  assert.equal(pedido.numero, 'EL261123-1507');
  assert.equal(pedido.carimbo, '23 NOV 2026 15:07');
  assert.equal(pedido.orgao, 'Prefeitura');
  assert.equal(pedido.cargo, CARGOS.secretario);
  assert.deepEqual(pedido.setores, ['Contabilidade', 'Recursos Humanos', 'Transparência']);
  assert.equal(pedido.conexoes.length, 3);
  assert.equal(pedido.formato, FORMATOS.online.nome);
});

test('o pedido recusa escolhas incompletas ou fora do órgão', () => {
  assert.throws(() => montar({ ...escolha, orgao: 'banco' }, data), /Órgão inválido/);
  assert.throws(() => montar({ ...escolha, setores: [] }, data), /pelo menos um setor/);
  assert.throws(() => montar({ ...escolha, orgao: 'camara', setores: ['tributario'] }, data), /Setor inválido/);
  assert.throws(() => montar({ ...escolha, formato: '' }, data), /Formato inválido/);
  assert.throws(() => montar({ ...escolha, cargo: 'rei' }, data), /Cargo inválido/);
  assert.equal(montar({ ...escolha, cargo: '' }, data).cargo, '');
});

test('texto digitado é limpo e limitado a 60 caracteres', () => {
  assert.equal(limparTexto('  Câmara \n de\tDomingos   Martins '), 'Câmara de Domingos Martins');
  assert.equal(limparTexto('x'.repeat(80)).length, 60);
  assert.equal(limparTexto(undefined), '');
});

test('a mensagem tem o número, o órgão com o nome digitado, os setores e o fecho', () => {
  const texto = mensagem(montar(escolha, data));
  assert.equal(texto, [
    'Olá! Vim pelo site da EL Produções de Software.',
    'Pedido de apresentação EL261123-1507',
    'Órgão: Prefeitura (Prefeitura de Venda Nova do Imigrante)',
    'Cargo: Secretário(a)',
    'Setores: Contabilidade, Recursos Humanos, Transparência',
    'Formato: Apresentação on-line',
    FORMATOS.online.fecho,
  ].join('\n'));
  const semCargo = mensagem(montar({ ...escolha, cargo: '', local: '' }, data));
  assert.ok(!semCargo.includes('Cargo:'));
  assert.ok(semCargo.includes('Órgão: Prefeitura\n'));
});

test('o link do WhatsApp leva o número e o texto codificado', () => {
  const link = linkWhatsApp('5527997161396', 'Pedido & agenda 1 + 1');
  assert.equal(link, 'https://wa.me/5527997161396?text=Pedido%20%26%20agenda%201%20%2B%201');
  assert.throws(() => linkWhatsApp('27997161396', 'x'), /inválido/);
});

test('horário: aberto, antes de abrir, depois de fechar e fim de semana', () => {
  assert.deepEqual(situacaoHorario(1, 9, 30, horario), { aberto: true, texto: 'Atendendo agora, até as 18h' });
  assert.equal(situacaoHorario(2, 7, 59, horario).texto, 'Fora do horário, volta hoje às 8h');
  assert.equal(situacaoHorario(3, 18, 0, horario).texto, 'Fora do horário, volta amanhã às 8h');
  assert.equal(situacaoHorario(5, 19, 0, horario).texto, 'Fora do horário, volta segunda às 8h');
  assert.equal(situacaoHorario(6, 10, 0, horario).texto, 'Fora do horário, volta segunda às 8h');
  assert.equal(situacaoHorario(0, 10, 0, horario).texto, 'Fora do horário, volta amanhã às 8h');
});

test('a hora da sede segue Brasília, qualquer que seja o fuso', () => {
  assert.deepEqual(agoraNaSede(new Date('2026-11-23T12:30:00Z')), { dia: 1, hora: 9, minuto: 30 });
  assert.deepEqual(agoraNaSede(new Date('2026-11-29T02:15:00Z')), { dia: 6, hora: 23, minuto: 15 });
});
