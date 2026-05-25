import {
    StateGraph,
    MemorySaver,
    MessagesAnnotation,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// 1. Herramientas

const retrieveDocuments = tool(
    async ({ query }: { query: string }) => {
        const docs = [
            "Las ventas del Q4 2024 aumentaron un 15% respecto al año anterior.",
            "El producto estrella representa el 40% de los ingresos totales.",
            "La expansión al mercado europeo está programada para Q2 2025.",
            "La satisfacción del cliente alcanzó el 92% en la última encuesta.",
            "Proyecciones de crecimiento: Contoso estima un incremento del 18% en ingresos para 2025, impulsado por la expansión europea y el lanzamiento de nuevos productos.",
            "Proyecciones de ventas 2025: Se esperan ventas totales de $12M, con un margen operativo del 22%.",
            "El plan estratégico 2025-2027 contempla un crecimiento compuesto anual (CAGR) del 14%, alcanzando $18M en 2027.",
        ];
        const queryTerms = query.toLowerCase().split(/\s+/);
        const relevant = docs.filter((d) => {
            const lower = d.toLowerCase();
            return queryTerms.some(
                (term) => term.length > 3 && lower.includes(term),
            );
        });
        return relevant.length > 0
            ? relevant.join("\n")
            : "No se encontraron documentos relevantes. Intenta otra consulta.";
    },
    {
        name: "retrieve_documents",
        description:
            "Recupera documentos relevantes de la base de conocimiento local sobre ventas, proyecciones, crecimiento y estrategia de Contoso.",
        schema: z.object({ query: z.string().describe("Término de búsqueda") }),
    },
);

const webSearch = tool(
    async ({ query }: { query: string }) => {
        return `Resultados web para "${query}": Tendencias del mercado indican un crecimiento del sector tecnológico del 12% anual.`;
    },
    {
        name: "web_search",
        description:
            "Busca información en la web cuando la base de conocimiento local es insuficiente.",
        schema: z.object({
            query: z.string().describe("Consulta de búsqueda web"),
        }),
    },
);

const tools = [retrieveDocuments, webSearch];

// 2. Modelo con tools vinculadas

const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
}).bindTools(tools);

// 3. Nodos del grafo

async function agentNode(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke([
        {
            role: "system",
            content: `Eres un agente RAG que debe obtener información fiable antes de responder.

                REGLAS DE HERRAMIENTAS (obligatorias):
                - SIEMPRE usa retrieve_documents primero con términos clave de la pregunta del usuario.
                - Si retrieve_documents no devuelve suficiente información, usa web_search como complemento.
                - NUNCA respondas sin haber invocado al menos una herramienta antes.
                - Refina los términos de búsqueda si el primer resultado no es suficiente.

                FLUJO OBLIGATORIO:
                1. Invoca retrieve_documents con palabras clave extraídas de la pregunta.
                2. Analiza el resultado. Si falta información, invoca web_search.
                3. Solo entonces responde al usuario con los datos obtenidos.`,
        },
        ...state.messages,
    ]);
    return { messages: [response] };
}

const toolNode = new ToolNode(tools);

// 4. Enrutamiento

function shouldContinue(state: typeof MessagesAnnotation.State) {
    const last = state.messages[state.messages.length - 1] as any;
    if (last.tool_calls?.length > 0) return "tools";
    return "__end__";
}

// 5. Grafo

const checkpointer = new MemorySaver();

const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
        tools: "tools",
        __end__: "__end__",
    })
    .addEdge("tools", "agent")
    .compile({ checkpointer });

// 6. Ejecución

(async () => {
    const config = { configurable: { thread_id: "rag_demo_thread" } };
    const result = await graph.invoke(
        {
            messages: [
                {
                    role: "user",
                    content:
                        "¿Cuáles son las proyecciones de crecimiento y ventas de la empresa?",
                },
            ],
        },
        config,
    );
    console.log(
        "Respuesta final del agente:",
        result.messages[result.messages.length - 1].content,
    );
})();
