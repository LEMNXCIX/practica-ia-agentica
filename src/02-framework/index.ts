import { tool } from "@langchain/core/tools";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { context } from "@langchain/core/utils/context";

const MODEL = "gpt-oss:120b-cloud";

const bookFlight = tool(
    async ({ date, location }: { date: string; location: string }) => {
        // Aquí iría tu lógica real de integración con una API de aerolínea
        return `Vuelo reservado exitosamente a ${location} para el ${date}.`;
    },
    {
        name: "book_flight",
        description:
            "Reserva un viaje dado un destino (location) y una fecha (date).",
        schema: z.object({
            date: z.string().describe("Fecha del viaje en formato AAAA-MM-DD"),
            location: z.string().describe("Destino del viaje"),
        }),
    },
);
//:Aqui se inicializa el modelo
const model = new ChatOllama({
    model: MODEL,
    temperature: 0.2,
});

//El messageModifier corresponde al contexto del agente
const agent = createReactAgent({
    llm: model,
    tools: [bookFlight],
    messageModifier:
        "Eres un asistente de reservas de vuelos. Responde las preguntas del usuario y utiliza las herramientas disponibles para realizar reservas.",
});

const result = await agent.invoke({
    messages: [
        {
            role: "user",
            content: "Reserva un vuelo a Madrid para el 2025-06-15.",
        },
    ],
});

console.log("Respuesta");
console.log(result.messages[result.messages.length - 1].content);
