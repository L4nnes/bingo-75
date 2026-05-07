# Bingo 75 PWA — versão 3

## Ajustes principais

- A tabela não tem scroll.
- O conteúdo da tabela é comprimido automaticamente para caber no bloco.
- Em baixa resolução, a fonte, os gaps, o padding e as bordas são reduzidos.
- O histórico agora usa o título “Últimos sorteados”.
- O histórico tem scroll interno para não estourar a borda inferior.
- No celular em modo paisagem, os controles viram um quarto bloco vertical.
- Os controles principais no modo compacto são: Sortear, Repetir, Conferir e Mais.
- O botão “Mais” mostra os controles secundários.
- A bolinha entre a tabela e o número sorteado recebeu correção de camada e não deve mais ficar escondida.
- A mensagem do modo manual agora ocupa uma faixa própria dentro do bloco da tabela e não sobrepõe os números.

## Como atualizar

Substitua estes arquivos da versão antiga:

- `index.html`
- `style.css`
- `app.js`
- `service-worker.js`
- `README.md`

Você pode manter:

- `manifest.json`
- `icon-192.png`
- `icon-512.png`

Depois rode:

```bash
python -m http.server 8000
```

No PC, use `Ctrl + F5` para forçar atualização.

No celular, se continuar abrindo a versão antiga, limpe os dados do site no Chrome ou remova o PWA antigo e instale novamente.

## Atalhos

- Espaço: sortear.
- Backspace: desfazer.
- F: tela cheia.
- R: repetir.
- H: ocultar/exibir histórico.
- C: conferir.
- M: modo manual.
- Esc: fechar modal, fechar “Mais” ou sair do modo manual.


## Ajuste v4

No modo compacto de celular, o botão “Ocultar controles” foi removido do menu “Mais”, porque ele ocultava o bloco inteiro de controle e prejudicava o uso.

Agora o menu “Mais” termina com o botão:

```text
Mostrar menos
```

Ao tocar nele, o painel volta para os botões principais:

```text
Sortear
Repetir
Conferir
Mais
```

No computador, o botão “Ocultar controles” continua disponível.


## Ajuste v5

O aviso do modo manual foi ajustado para permanecer sempre em uma única linha, reduzindo automaticamente o tamanho do texto em telas menores.


## Ajuste v6

O aviso do modo manual agora foi forçado no HTML e no CSS como uma única frase:

```text
MODO MANUAL ATIVO - toque nos números para marcar/desmarcar
```

Foram adicionadas regras para impedir quebra de linha, reduzir a fonte conforme a largura do bloco e evitar wrap automático.
