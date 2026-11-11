const WORKER_URL = "https://minichat-ai.crysnanth62.workers.dev";
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");
const status = document.getElementById("chat-status");

// Armazena o histórico da conversa
const history = [];

// Adiciona uma mensagem na tela
function addMessage(role, content) {
    const article = document.createElement("article");
    const paragraph = document.createElement("p");

    article.className = `message message--${role}`;
    paragraph.textContent = content;

    article.appendChild(paragraph);
    messages.appendChild(article);

    messages.scrollTop = messages.scrollHeight;
}

// Função responsável pela respota da IA
async function getAIResponse() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: history.slice(-10)
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        data.error || "Limite de mensagens atingido."
      );
    }

    throw new Error(
      data.error || "Não foi possível consultar a IA."
    );
  }

  return data.reply;
}

// Captura o envio do formulário
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = input.value.trim();

    if (!text || sendButton.disabled) return;

    addMessage("user", text);
    history.push({ role: "user", content: text });

    input.value = "";
    sendButton.disabled = true;

    status.hidden = false;
    status.textContent = "IA está digitando...";

    try {
        const reply = await getAIResponse();

        addMessage("assistant", reply);
        history.push({ role: "assistant", content: reply });
    } catch (error) {
        console.error(error);

        // Não mantém no histórico uma pergunta sem resposta
        history.pop();

        addMessage(
            "assistant",
            error.message || "Ocorreu um erro. Tente novamente."
        );
    } finally {
        status.hidden = true;
        sendButton.disabled = false;
        input.focus();
    }
});
