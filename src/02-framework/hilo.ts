import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

// 1. Definición de Herramientas del Negocio
const getSpecials = tool(
    async () => {
        return `Especiales de hoy:\n- Sopa Especial: Crema de Almejas (Clam Chowder)\n- Ensalada Especial: Ensalada Cobb`;
    },
    {
        name: "get_specials",
        description: "Proporciona la lista de platos especiales del día.",
        schema: z.object({}),
    },
);

const getItemPrice = tool(
    async ({ menuItem }: { menuItem: string }) => {
        return `El precio de [${menuItem}] es $9.99.`;
    },
    {
        name: "get_item_price",
        description: "Proporciona el precio de un plato específico del menú.",
        schema: z.object({
            menuItem: z
                .string()
                .describe("El nombre del plato del menú a consultar"),
        }),
    },
);

const getDrinks = tool(
    async () => {
        return ["agua", "jugo de naranja"];
    },
    {
        name: "get_drinks",
        description: "Proporciona la lista de bebidas disponibles.",
        schema: z.object({}),
    },
);

// 2. Configuración del Agente y su Persistencia de Memoria (Checkpointer)
const model = new ChatOllama({ model: "gpt-oss:120b-cloud", temperature: 0 });
const memory = new MemorySaver(); // El equivalente al gestor de Threads de Azure

const hostAgent = createReactAgent({
    llm: model,
    tools: [getSpecials, getItemPrice, getDrinks],
    messageModifier:
        "Eres un Host amable de un restaurante. Responde preguntas sobre el menú usando tus herramientas.No respondas a preguntas que no estén relacionadas con el menú o las bebidas.   ",
    checkpointSaver: memory, // Inyección de memoria para el historial de conversación
});

// 3. Ejecución Simulada de una Conversación Multi-Turno Persistente
// Definimos un thread_id único para este usuario. Mientras usemo este ID, el agente recordará todo.
const config = { configurable: { thread_id: "thread-restaurante-usuario-1" } };

const userConversation = [
    "Hola",
    "¿Cuál es la sopa especial de hoy?",
    "¿Cuánto cuesta esa sopa?",
    "Excelente, muchas gracias por tu ayuda.",
    "cuales bebidas ofrecen",
    "cuanto es dos + dos",
];

for (const userInput of userConversation) {
    console.log(`\n👤 Usuario: "${userInput}"`);

    const response = await hostAgent.invoke(
        { messages: [{ role: "user", content: userInput }] },
        config, // Pasar la configuración de sesión en cada interacción
    );

    const agentReply = response.messages[response.messages.length - 1].content;
    console.log(`🤖 Agente: ${agentReply}`);
}
