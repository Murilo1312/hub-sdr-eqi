# Hub de Agentes SDR EQI

Este repositório agora hospeda o **Hub de Agentes SDR EQI**: um console/workbench com
13 agentes de IA especializados na esteira de SDR (Sales Development Representative)
da EQI Investimentos — triagem de leads, qualificação consultiva, personalização
multicanal, cadência, agendamento, atualização de CRM, briefing para assessores, e
mais.

> Este repositório **não é mais** o hub de treinamento antigo (scripts de ligação,
> quebra de objeções, simulador de propostas, metas). Se você precisa da versão
> anterior, ela está preservada na tag
> [`backup-hub-antigo-2026-07`](../../releases/tag/backup-hub-antigo-2026-07).

## O que o site faz

- **Dashboard** (`index.html`): mostra os 13 agentes organizados em uma trilha vertical
  de 4 fases do pipeline (Fundação, Fecha o ciclo, Alto impacto, Gestão).
- **Console do agente** (`agente.html?id=N`): mostra o objetivo, tarefas, entradas
  esperadas, saída esperada, ferramentas recomendadas e o system prompt completo de
  cada agente. Você cola o dado de entrada (lead, mensagem, dados de qualificação) e
  clica em "Rodar agente" para chamar o modelo da Anthropic diretamente do navegador.
- **Histórico local**: guarda as últimas 20 execuções de cada agente no seu navegador,
  com opção de exportar tudo como JSON ou limpar.

Todo o site é HTML/CSS/JS puro (sem framework, sem build step), pensado para rodar
direto no GitHub Pages.

## Como usar sua chave de API

1. Clique em **Configurações** no menu superior (disponível em qualquer página).
2. Cole sua chave de API da Anthropic no campo indicado.
3. Escolha o modelo (padrão: `claude-sonnet-5`).
4. Clique em **Salvar**.

A chave é usada apenas para chamar `https://api.anthropic.com/v1/messages` diretamente
do seu navegador (modelo "bring your own key").

**Importante:**
- A chave fica salva **somente no `localStorage` do seu navegador**. Ela nunca é
  enviada para nenhum servidor além da API oficial da Anthropic.
- **Nunca cole sua chave em um arquivo deste repositório nem faça commit dela.** Se
  você limpar os dados do navegador ou trocar de dispositivo, será necessário colar a
  chave novamente.
- Use o botão **Limpar** na tela de Configurações para apagar a chave salva localmente.

## Site publicado

O GitHub Pages deste repositório já está habilitado e publica automaticamente a
branch `main`:

https://murilo1312.github.io/hub-sdr-eqi/

## Recuperando a versão anterior

O estado completo do hub de treinamento antigo (antes desta migração) foi marcado com
a tag `backup-hub-antigo-2026-07` e enviado ao GitHub antes de qualquer alteração. Para
recuperá-lo localmente:

```bash
git fetch --tags
git checkout backup-hub-antigo-2026-07
```
