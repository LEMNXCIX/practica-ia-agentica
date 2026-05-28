import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import z from "zod";

const getFlightTimes = (destination: string): string => {
    const flights: Record<string, string> = {
        Paris: "Departures: 08:00, 12:30, 17:45 — from $350",
        Tokyo: "Departures: 11:00, 23:30 — from $890",
        Barcelona: "Departures: 07:15, 14:00, 19:30 — from $280",
    };
    if (destination in flights) {
        return flights[destination];
    }
    throw new Error(
        `404: No flights found for ${destination} in primary system`,
    );
};

const getFlightTimesBackup = (destination: string): string => {
    const backupFlights: Record<string, string> = {
        Berlin: "Departures: 09:00, 16:00 — from $220",
        Sydney: "Departures: 22:00 — from $1200",
        "New York City": "Departures: 06:00, 10:30, 15:00, 20:00 — from $450",
    };
    return (
        backupFlights[destination] ||
        `No flights found for ${destination} in any system.`
    );
};

const getFlightTimesTool = tool(
    async ({ destination }) => {
        return getFlightTimes(destination);
    },
    {
        name: "get_flight_times",
        description:
            "Obtiene los horarios y precios de vuelos para un destino específico usando el sistema principal.",
        schema: z.object({
            destination: z
                .string()
                .describe(
                    "El nombre de la ciudad de destino en mayúscula/minúscula (ej. Paris, Tokyo)",
                ),
        }),
    },
);

const getFlightTimesBackupTool = tool(
    async ({ destination }) => {
        return getFlightTimesBackup(destination);
    },
    {
        name: "get_flight_times_backup",
        description:
            "Sistema de respaldo para consultar vuelos si el sistema principal falla o no encuentra el destino.",
        schema: z.object({
            destination: z
                .string()
                .describe("El nombre de la ciudad de destino"),
        }),
    },
);
const model = new ChatOllama({ model: "gpt-oss:120b-cloud", temperature: 0 });
const tools = [getFlightTimesTool, getFlightTimesBackupTool];
const modelWithTools = model.bindTools(tools);

const AgentState = MessagesAnnotation;

async function callModel(state: typeof AgentState.State) {
    const response = await modelWithTools.invoke(state.messages);
    return { messages: [response] };
}

async function executeTools(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    // console.log(lastMessage);
    // console.log("-> Modelo solicitó herramientas:", lastMessage.tool_calls);
    const toolCalls = lastMessage.tool_calls || [];
    const results: ToolMessage[] = [];

    for (const call of toolCalls) {
        console.log("-> Ejecutando herramienta:", call.name, call.args);
        if (call.name === "get_flight_times") {
            try {
                const res = getFlightTimes(call.args.destination);
                results.push(
                    new ToolMessage({
                        content: res,
                        tool_call_id: call.id,
                        name: call.name,
                    }),
                );
            } catch (err: any) {
                // Metacognición: Capturamos el error 404 de la API principal e inyectamos un mensaje
                // indicando al agente que intente utilizar el sistema de respaldo.
                results.push(
                    new ToolMessage({
                        content: `ERROR: ${err.message}. Sistema principal no disponible. Debes llamar a get_flight_times_backup para resolver el destino.`,
                        tool_call_id: call.id,
                        name: call.name,
                    }),
                );
            }
        } else if (call.name === "get_flight_times_backup") {
            const res = getFlightTimesBackup(call.args.destination);
            results.push(
                new ToolMessage({
                    content: res,
                    tool_call_id: call.id,
                    name: call.name,
                }),
            );
        }
    }

    return { messages: results };
}

const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", executeTools)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", (state) => {
        const lastMessage = state.messages[
            state.messages.length - 1
        ] as AIMessage;
        return lastMessage.tool_calls && lastMessage.tool_calls.length > 0
            ? "tools"
            : END;
    })
    .addEdge("tools", "agent");

const app = workflow.compile({
    checkpointer: new MemorySaver(),
});

(async () => {
    const config = { configurable: { thread_id: "rag_demo_thread" } };
    const result = await app.invoke(
        {
            messages: [
                {
                    role: "user",
                    content: "¿Cuándo partira el avión a Berlin?",
                },
            ],
        },
        config,
    );

    console.log(
        "Respuesta final del grafo:",
        result.messages[result.messages.length - 1].content,
    );
})();
