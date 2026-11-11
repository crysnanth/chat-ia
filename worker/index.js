
const MODEL = "@cf/google/gemma-4-26b-a4b-it";

const allowedOrigins = new Set([
  "http://localhost:5501",
  "http://127.0.0.1:5501",
  "http://0.0.0.0:5501",
  "https://minichat-ai-web.pages.dev"
]);

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers
    });
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin");

        const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Vary": "Origin"
        };

        if (allowedOrigins.has(origin)) {
            headers["Access-Control-Allow-Origin"] = origin;
        }

        const respond = (data, status = 200) =>
            jsonResponse(data, status, headers);

        // Verifica a origem
        if (origin && !allowedOrigins.has(origin)) {
            return respond({ error: "Origem não permitida." }, 403);
        }

        // Responde à verificação CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers
            });
        }

        if (request.method !== "POST") {
            return respond({ error: "Método não permitido." }, 405);
        }

        if (!request.headers.get("Content-Type")
            ?.toLowerCase().includes("application/json")) {
            return respond({ error: "Envie dados em JSON." }, 415);
        }

        // Limita o tamanho do corpo da requisição
        const contentLength = Number(
            request.headers.get("Content-Length") || 0
        );

        if (contentLength > 25000) {
            return respond({ error: "Mensagem muito grande." }, 413);
        }

        try {
            const rawBody = await request.text();

            if (rawBody.length > 25000) {
                return respond({ error: "Mensagem muito grande." }, 413);
            }

            let body;

            try {
                body = JSON.parse(rawBody);
            } catch {
                return respond({ error: "JSON inválido." }, 400);
            }

            const messages = body?.messages;

            const valid =
                Array.isArray(messages) &&
                messages.length > 0 &&
                messages.length <= 10 &&
                messages.every(message =>
                    ["user", "assistant"].includes(message.role) &&
                    typeof message.content === "string" &&
                    message.content.trim().length > 0 &&
                    message.content.length <= 2000
                ) &&
                messages.at(-1).role === "user";

            if (!valid) {
                return respond({
                    error: "Histórico de mensagens inválido."
                }, 400);
            }

            // Limite aproximado por endereço IP
            const ip = request.headers.get("CF-Connecting-IP")
                || "local";

            const userLimit = await env.RATE_LIMITER.limit({
                key: ip
            });

            if (!userLimit.success) {
                return respond({
                    error: "Muitas mensagens. Tente novamente em um minuto."
                }, 429);
            }

            // Limite aproximado global por região Cloudflare
            const globalLimit = await env.GLOBAL_LIMITER.limit({
                key: "minichat-global"
            });

            if (!globalLimit.success) {
                return respond({
                    error: "O chat está ocupado. Tente novamente em breve."
                }, 429);
            }

            const conversation = [
                {
                    role: "system",
                    content:
                        "Você é o MiniChat AI, um assistente amigável. " +
                        "Responda em português brasileiro de maneira " +
                        "clara, objetiva e preferencialmente breve."
                },
                ...messages
            ];

            // Consulta o Gemma 4
            const result = await env.AI.run(MODEL, {
                messages: conversation,
                max_completion_tokens: 350,
                chat_template_kwargs: {
                    enable_thinking: false
                }
            });

            const reply = result.choices?.[0]?.message?.content;

            if (typeof reply !== "string" || !reply.trim()) {
                return respond({
                    error: "A IA não retornou uma resposta."
                }, 502);
            }

            return respond({ reply: reply.trim() });

        } catch (error) {
            console.error("Falha na integração:", error?.message);

            return respond({
                error: "A IA está indisponível no momento."
            }, 503);
        }
    }
};