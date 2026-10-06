# Desafio de desenvolvimento

Este repositório contém três aplicações independentes para o mesmo desafio:

- `csharp-api`: API ASP.NET Core (.NET 8).
- `node-api`: API Express escrita em TypeScript.
- `frontend-angular`: interface Angular que consome a API Node por padrão.

## Regras aplicadas

| Venda | Comissão |
| --- | --- |
| Menor que R$ 100,00 | 0% |
| De R$ 100,00 até R$ 499,99 | 1% |
| A partir de R$ 500,00 | 5% |

A multa do título vencido é de 2,5% do valor original por dia de atraso. Movimentações de saída não podem deixar o estoque negativo.

## Como executar

Cada API possui instruções no seu próprio README. Para usar a interface, inicie primeiro `node-api` na porta `3000`, depois execute o Angular na porta `4200`.

```bash
cd node-api && yarn install && yarn dev
cd frontend-angular && yarn install && yarn start
```

O frontend usa `http://localhost:3000/api` como URL padrão. Isso pode ser mudado em `frontend-angular/src/environments/environment.ts`.
