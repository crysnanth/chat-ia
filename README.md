# MiniChat AI

Chat simples com inteligência artificial desenvolvido como projeto acadêmico da disciplina de **Front-end**. A interface utiliza **HTML, CSS e JavaScript puro**, sem frameworks, e as respostas são geradas pelo **Gemma 4** por meio do **Cloudflare Workers AI**.

**Site:** https://minichat-ai-web.pages.dev

## Funcionalidades

- Envio e exibição de mensagens sem recarregar a página;
- Respostas geradas por IA, em português;
- Contexto das últimas 10 mensagens da conversa;
- Indicador de processamento enquanto a IA responde;
- Tratamento de erros e aviso quando o limite de requisições é atingido;
- Validação das mensagens no Worker e controle aproximado de requisições.

O histórico existe somente na memória do navegador durante a sessão. Não há login nem banco de dados.

## Tecnologias

| Camada | Tecnologia | Finalidade |
| --- | --- | --- |
| Interface | HTML5 e CSS3 | Estrutura, aparência e responsividade |
| Lógica do chat | JavaScript (DOM e Fetch API) | Enviar mensagens e exibir respostas |
| API | Cloudflare Workers | Validar requisições e consultar a IA |
| Modelo de IA | Gemma 4 26B A4B IT | Gerar as respostas |
| Hospedagem | Cloudflare Pages + Workers | Publicar site e API |
| CI/CD | GitHub Actions + Wrangler | Publicar automaticamente após mudanças na `main` |

## Como funciona

```text
Usuário
   ↓
index.html + script.js
   ↓ POST / (JSON)
Cloudflare Worker
   ↓ env.AI.run(...)
Gemma 4 — Workers AI
   ↓ resposta JSON
script.js → mensagem na interface
```

O front-end envia um objeto com `messages` para o Worker. Exemplo:

```json
{
  "messages": [
    { "role": "user", "content": "O que é JavaScript?" }
  ]
}
```

A API responde com um JSON no formato:

```json
{
  "reply": "JavaScript é uma linguagem usada para criar interatividade em páginas web."
}
```

O texto é apenas ilustrativo: a resposta real é produzida pelo modelo e pode variar.

## Estrutura do repositório

```text
chat-ia/
├── index.html                  # HTML usado durante o desenvolvimento
├── style.css                   # CSS editado pelo grupo
├── script.js                   # Lógica do chat e URL do Worker
├── public/                     # Arquivos estáticos publicados no Pages
├── worker/
│   └── index.js                # API e integração com o Gemma 4
├── wrangler.jsonc              # Configuração de Workers AI e rate limiting
├── .github/workflows/
│   └── deploy.yml              # Deploy automático via GitHub Actions
├── package.json
├── package-lock.json
└── README.md
```

**Importante:** o workflow copia `index.html`, `script.js` e `style.css` da **raiz** para `public/` antes de publicar. Portanto, edite os arquivos da **raiz**: eles são a fonte de verdade para o deploy automático.

## Executar localmente

### Pré-requisitos

- Node.js e npm;
- Python 3 (para servir o HTML localmente) ou outro servidor estático;
- Conta gratuita da Cloudflare com acesso ao Workers AI;
- Wrangler autenticado na conta que contém o Worker.

### Passo a passo

1. Clone o repositório e instale as dependências:

```bash
git clone https://github.com/crysnanth/chat-ia.git
cd chat-ia
npm ci
```

2. Autentique o Wrangler, se necessário:

```bash
npx wrangler login
```

3. Inicie o Worker (terminal 1):

```bash
npx wrangler dev --port 8787
```

4. Inicie o front-end (terminal 2):

```bash
python3 -m http.server 5501
```

5. Abra **http://localhost:5501**.

O `script.js` versionado utiliza o endereço HTTPS do Worker publicado. Para testar o Worker **local** com o navegador, altere temporariamente `WORKER_URL` em `script.js` para `http://localhost:8787`; não envie essa troca para a `main`. O arquivo `worker/index.js` deve autorizar a origem do seu servidor local na lista `allowedOrigins`.

O binding Workers AI é executado na infraestrutura da Cloudflare durante o desenvolvimento e está sujeito à cota da conta.

### Testar a API local pelo terminal

Com o Wrangler em execução:

```bash
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Olá! Quem é você?"}]}'
```

Uma resposta bem-sucedida contém a propriedade `reply`. A API aceita apenas `POST` com JSON; abrir a URL do Worker diretamente no navegador envia `GET` e resulta em `405 Method Not Allowed`.

## Publicação automática

O GitHub Actions está definido em `.github/workflows/deploy.yml`.

- **Quando executa:** a cada push/merge na branch `main` (ou manualmente por `workflow_dispatch`);
- **Worker:** `npx wrangler deploy --config wrangler.jsonc`;
- **Pages:** `npx wrangler pages deploy public --project-name=minichat-ai-web --branch=main`.

Para configurar o deploy em um fork ou outra conta, cadastre estes **GitHub Actions secrets**:

| Secret | Conteúdo |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token da Cloudflare autorizado a editar Workers Scripts e Cloudflare Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador da conta Cloudflare |

Nunca publique tokens, arquivos `.dev.vars`, `.env` ou outras credenciais no repositório.

O projeto Pages foi criado por **Direct Upload**; por isso, a atualização automática é feita pelo workflow com Wrangler, sem exigir um novo projeto Pages.

## Contribuição em grupo

1. Crie uma branch a partir da `main`, por exemplo: `style/layout-chat`, `feature/melhorias-chat` ou `fix/erro-envio`;
2. Faça as alterações na sua branch;
3. Envie a branch para o GitHub e abra um Pull Request para a `main`;
4. Peça revisão a outro integrante e faça o merge após a aprovação;
5. Confira o resultado em **Actions** e teste o site publicado.

Evite editar diretamente a `main`, pois o merge nessa branch dispara a publicação em produção.

## Limites e observações

- O Worker valida as mensagens e limita o histórico a até **10 mensagens**, com até **2.000 caracteres por mensagem**;
- O rate limiting configurado é **aproximado**: 5 requisições por minuto por IP e 30 por minuto por região/localidade do Cloudflare, não um limite global rígido;
- O uso do Workers AI depende da **cota gratuita disponível** e dos limites do provedor;
- As origens permitidas por CORS são configuradas no `worker/index.js`. Ao mudar o domínio do site, atualize `allowedOrigins` e publique novamente o Worker;
- CORS não substitui autenticação ou proteção contra abuso por clientes que não sejam navegadores.

## Referências

- [MDN — HTML](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
- [MDN — CSS](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
- [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [GitHub Actions](https://docs.github.com/pt/actions)

---

Projeto acadêmico desenvolvido em grupo para a disciplina de Front-end.
