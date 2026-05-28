import "dotenv/config";
import { ChatOllama } from "@langchain/ollama";
import {
    START,
    END,
    StateGraph,
    MessagesAnnotation,
    Annotation,
} from "@langchain/langgraph";

const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    complexity: Annotation<"simple" | "complex">,
});

// Modelo ligero para tareas simples
const fastModel = new ChatOllama({
    model: "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M",
    temperature: 0,
});

// Modelo más capaz para tareas complejas
const capableModel = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
});

async function routeByComplexity(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1]
        .content as string;

    // Usar modelo rápido para clasificar complejidad
    const classification = await fastModel.invoke([
        {
            role: "system",
            content: `Clasifica la consulta como 'simple' o 'complex'.
Simple: preguntas directas, saludos, búsquedas únicas.
Complex: planificación multi-paso, comparaciones, análisis.
Responde solo una palabra.`,
        },
        { role: "user", content: lastMessage },
    ]);

    const complexity = classification.content.toString().trim().toLowerCase();
    console.log("Complejidad detectada:", complexity);
    return { complexity: complexity === "complex" ? "complex" : "simple" };
}

async function processWithModel(state: typeof AgentState.State) {
    const model = state.complexity === "complex" ? capableModel : fastModel;
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

const workflow = new StateGraph(AgentState)
    .addNode("classify", routeByComplexity)
    .addNode("process", processWithModel)
    .addEdge(START, "classify")
    .addEdge("classify", "process")
    .addEdge("process", END);

const app = workflow.compile();

(async () => {
    const config = { configurable: { thread_id: "demo-1" } };
    const result = await app.invoke(
        { messages: [{ role: "user", content: "Busca vuelos a París" }] },
        config,
    );

    console.log(
        "Respuesta final del grafo:",
        result.messages[result.messages.length - 1].content,
    );

    // Esperar 2 segundos antes de que el script termine por completo
    console.log("Esperando a que LangSmith envíe las trazas...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
})();
