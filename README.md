# EL Produções de Software | gestão pública em Domingos Martins - ES

Projeto de Izabel Pereira Lopes Fardin para o estágio supervisionado (Análise e Desenvolvimento de Sistemas, Multivix). A página mostra a EL Produções de Software, empresa de Domingos Martins que desde 1993 desenvolve sistemas integrados para prefeituras, câmaras e institutos de previdência. Canais oficiais da empresa: https://www.el.com.br.

Página publicada: https://estagio-multivix-izabel.vercel.app

## Sobre a página

Quem visita escolhe o tipo de órgão e vai marcando os setores que quer conhecer. Cada setor marcado acende numa roda; quando dois setores marcados trocam informação entre si (por exemplo, a folha de pagamento que segue para a contabilidade), aparece um fio ligando os dois, e o ofício ao lado descreve essa passagem. Ao protocolar, o ofício ganha número, carimbo com data e hora e um link de WhatsApp já preenchido com o pedido. Nenhuma escolha é salva.

Clientes, sistemas instalados, estados e tamanho da equipe foram tirados do site oficial. Horário de atendimento, etapas de implantação e as ligações entre setores servem só para ilustrar. Razão social, CNPJ e endereço do rodapé são os do cartão CNPJ.

## Rodando localmente

Requisito: Node.js a partir da versão 18, sem pacotes extras.

```bash
npm run dev     # sobe a prévia local
npm test        # roda os testes de pedido.js
npm run build   # monta dist/ para a Vercel
```

## Arquivos

- `index.html`: textos da página e ícones em SVG.
- `styles.css`: cores, tipografia e ajustes para telas pequenas.
- `pedido.js`: regras sem interface (órgãos e seus setores, ligações, número do protocolo, texto da mensagem, horário).
- `app.js`: desenha a roda, preenche o ofício, cuida do menu e da luz de atendimento.
- `site.config.js`: WhatsApp e horário, num lugar só.
- `testes/pedido.test.mjs`: testes de `pedido.js` com o executor nativo do Node.
- `server.mjs` e `scripts/build.mjs`: prévia local e preparação da pasta `dist/`.

## Como o pedido funciona

A câmara não tem tributário, saúde e educação; o setor de previdência só existe para institutos. Trocando o tipo de órgão, o que não pertence a ele é desmarcado.

O protocolo tem o formato ELAAMMDD-HHMM (data e hora do aparelho de quem preenche). Mexer em qualquer campo depois de protocolar apaga o carimbo, e o pedido precisa ser protocolado de novo, assim a mensagem enviada sempre bate com a tela.

A luz de "atendendo agora" calcula a hora de Brasília, independente do fuso de quem abre a página.

## Créditos

Imagens ilustrativas (não são da empresa), recortadas do Wikimedia Commons:

- Turma de servidores em capacitação: Senado Federal, licença CC BY 2.0.
- Igreja luterana no Centro de Domingos Martins: Fernando Madeira/MTur, domínio público.

Tipografia: Sofia Sans Condensed, Albert Sans e Red Hat Mono (SIL Open Font License; textos das licenças em `assets/fonts`).
