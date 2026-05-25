import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
    StateGraph,
    MessagesAnnotation,
    MemorySaver,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { th } from "zod/v4/locales";

const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
});

async function generatResponse(state: typeof MessagesAnnotation.State) {
    const generatResponse = await model.invoke([
        new SystemMessage(
            "Eres un asistente util. Genera una respuesta clar y consisa para el usuario",
        ),
        ...state.messages,
    ]);

    return { messages: [generatResponse] };
}

async function HumanReview(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    console.log("\n Respueta generada para revision:");
    console.log(lastMessage.content);
    console.log("\n Esperando aprobacion del usuario...");
}

const checkpointer = new MemorySaver();
const graph = new StateGraph(MessagesAnnotation)
    .addNode("generate", generatResponse)
    .addNode("review", HumanReview)
    .addEdge("__start__", "generate")
    .addEdge("generate", "review")
    .addEdge("review", "__end__")
    .compile({
        checkpointer,
        interruptBefore: ["review"], // ⬅️ El grafo se detiene aquí para revisión humana
    });

const thread = { configurable: { thread_id: "hilo_de_aprobacion_01" } };

const state1 = await graph.invoke(
    {
        messages: [
            new HumanMessage("Escribe un poema de 4 lineas sobre el mar"),
        ],
    },
    thread,
);

console.log("\n✅ El grafo se detuvo. El humano puede revisar la respuesta.");
console.log(
    "Último mensaje:",
    state1.messages[state1.messages.length - 1].content,
);

const state2 = await graph.invoke(null, thread);
console.log("\n🎉 Respuesta aprobada y entregada al usuario.");
