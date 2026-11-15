const WORKER_URL = "https://minichat-ai.crysnanth62.workers.dev";

const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");
const status = document.getElementById("chat-status");

// Elementos da exclusão
const clearButton = document.getElementById("clear-button");
const deleteModal = document.getElementById("delete-modal");
const cancelDelete = document.getElementById("cancel-delete");
const confirmDelete = document.getElementById("confirm-delete");

// Armazena o histórico da conversa
const history = [];

// Animação da lixeira
function animateTrash() {
    clearButton.classList.add("limpar-animacao");

    setTimeout(() => {
        clearButton.classList.remove("limpar-animacao");
    }, 500);
}

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

// Função responsável pela resposta da IA
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


// ======================================
// FUNCIONALIDADE DE EXCLUSÃO DA CONVERSA
// ======================================

// Abre a confirmação ao clicar na lixeira
clearButton.addEventListener("click", () => {

    animateTrash();

    deleteModal.hidden = false;

    cancelDelete.focus();
});


// Fecha a janela ao clicar em cancelar
cancelDelete.addEventListener("click", () => {

    deleteModal.hidden = true;

    clearButton.focus();
});


// Confirma a exclusão da conversa
confirmDelete.addEventListener("click", () => {

    // Efeito visual da lixeira
    animateTrash();

    // Limpa o histórico armazenado
    history.length = 0;

    // Limpa as mensagens da tela
    messages.innerHTML = "";

    // Restaura a mensagem inicial
    addMessage(
        "assistant",
        "Olá! Sou o Chat JCG. Como posso ajudar você hoje?"
    );

    // Limpa o campo de digitação
    input.value = "";

    // Fecha a janela de confirmação
    deleteModal.hidden = true;

    // Retorna o foco para a lixeira
    clearButton.focus();

});


// Fecha a janela ao clicar fora dela
deleteModal.addEventListener("click", (event) => {

    if (event.target === deleteModal) {

        deleteModal.hidden = true;

        clearButton.focus();
    }

});


// Fecha a janela ao pressionar ESC
document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && !deleteModal.hidden) {

        deleteModal.hidden = true;

        clearButton.focus();
    }

});