import {
    StateGraph,
    MessagesAnnotation,
    MemorySaver,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ==========================================
// 1. DEFINICIÓN DE LAS HERRAMIENTAS (Sales Tools)
// ==========================================

// Herramienta A: Simulación de consulta a base de datos de ventas (SQLite/Postgres)
const fetchSalesData = tool(
    async ({ query }: { query: string }) => {
        const salesDatabase: Record<string, string> = {
            q4: "Ventas Registradas Q4: $2.5M (+15% en comparación con Q3)",
            q3: "Ventas Registradas Q3: $2.2M (+8% en comparación con Q2)",
            producto_estrella:
                "Producto Estrella: Silla de Oficina Ergonómica Contoso ($1.0M, representando el 40% del total)",
        };

        const key = Object.keys(salesDatabase).find((k) =>
            query.toLowerCase().includes(k),
        );
        return key
            ? salesDatabase[key]
            : "No se encontraron registros de ventas que coincidan con la búsqueda.";
    },
    {
        name: "fetch_sales_data",
        description:
            "Consulta los datos del registro de ventas de Contoso. Usa palabras clave como 'q4', 'q3', o 'producto_estrella'.",
        schema: z.object({
            query: z
                .string()
                .describe(
                    "Término o palabra clave de búsqueda en la base de datos de ventas",
                ),
        }),
    },
);

// Herramienta B: Calculadora de métricas de ventas
const calculateMetric = tool(
    async ({
        operation,
        values,
    }: {
        operation: "sum" | "average";
        values: number[];
    }) => {
        if (values.length === 0)
            return "Error: No se proporcionaron valores numéricos para calcular.";

        if (operation === "sum") {
            const sum = values.reduce((acc, curr) => acc + curr, 0);
            return `Resultado del cálculo de Suma: ${sum}`;
        } else {
            const avg =
                values.reduce((acc, curr) => acc + curr, 0) / values.length;
            return `Resultado del cálculo de Promedio: ${avg}`;
        }
    },
    {
        name: "calculate_metric",
        description:
            "Realiza cálculos matemáticos de suma o promedio sobre una lista de números.",
        schema: z.object({
            operation: z
                .enum(["sum", "average"])
                .describe("La operación matemática a realizar"),
            values: z
                .array(z.number())
                .describe(
                    "Lista de valores numéricos sobre los cuales aplicar el cálculo",
                ),
        }),
    },
);

const tools = [fetchSalesData, calculateMetric];

// Inicializamos el modelo vinculando las herramientas
const localModel = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
}).bindTools(tools);

// ==========================================
// 2. DEFINICIÓN DE LOS NODOS DEL GRAFO
// ==========================================

// Nodo del Agente: Procesa la entrada e inyecta la directiva del sistema
async function agentNode(state: typeof MessagesAnnotation.State) {
    const response = await localModel.invoke([
        {
            role: "system",
            content:
                "Eres un Analista Financiero Senior de Contoso. Utiliza tus herramientas de acceso a datos y cálculo de métricas para responder preguntas de negocio de manera precisa y profesional.",
        },
        ...state.messages,
    ]);

    // Devolvemos el mensaje del asistente para actualizar el estado del grafo
    return { messages: [response] };
}

// Nodo de Ejecución de Herramientas (ToolNode preconstruido)
const toolNode = new ToolNode(tools);

// ==========================================
// 3. LÓGICA DE ENRUTAMIENTO (Router)
// ==========================================

function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMsg = state.messages[state.messages.length - 1] as any;

    // Si el último mensaje contiene solicitudes de llamadas a funciones (tool_calls), enrutamos a 'tools'
    if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
        return "tools";
    }
    // De lo contrario, finalizamos la ejecución
    return "__end__";
}

// ==========================================
// 4. CONSTRUCCIÓN Y COMPILACIÓN DEL GRAFO
// ==========================================

// MemorySaver actúa como persistencia de hilos (Threads) local
const checkpointer = new MemorySaver();

const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
        tools: "tools",
        __end__: "__end__",
    })
    .addEdge("tools", "agent") // Retorna al agente después de ejecutar la herramienta
    .compile({ checkpointer });

// ==========================================
// 5. EJECUCIÓN MULTI-TURNO CON IDENTIFICADOR DE HILO
// ==========================================

// Creamos un hilo conversacional dedicado
const config = { configurable: { thread_id: "hilo_analisis_contoso" } };

// Turno 1: Preguntar por datos específicos
const step1 = await graph.invoke(
    {
        messages: [
            {
                role: "user",
                content:
                    "¿Cuáles fueron las ventas del Q3 y del Q4 de Contoso?",
            },
        ],
    },
    config,
);
console.log("Asistente:", step1.messages[step1.messages.length - 1].content);

// Turno 2: Pedir cálculos sobre el historial persistido en el mismo hilo
const step2 = await graph.invoke(
    {
        messages: [
            {
                role: "user",
                content:
                    "¿Puedes calcular el promedio de esas ventas del Q3 y Q4?",
            },
        ],
    },
    config,
);
console.log("Asistente:", step2.messages[step2.messages.length - 1].content);
