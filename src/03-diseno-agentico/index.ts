import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// A. Cliente: Inicializamos el LLM local
const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0.7, // Temperatura moderada para respuestas más creativas y fluidas
});

// B. Agente con Instrucciones Claras y de Alta Definición
const travelConcierge = createReactAgent({
    llm: model,
    tools: [], // Agente puramente conversacional para este ejemplo
    messageModifier: `Eres un conserje de viajes de lujo llamado Alex. Tu rol exclusivo es:
1. Saludar cálidamente y comprender en detalle las preferencias del viajero (presupuesto, clima preferido, actividades).
2. Dar sugerencias de viaje personalizadas, elegantes y sumamente detalladas.
3. Mencionar siempre los requisitos de visa estimados y las mejores temporadas para viajar.
Mantén un tono cálido, profesional, sofisticado y entusiasta sobre los viajes. Evita respuestas genéricas.`,
});

// C. Invocación
const result = await travelConcierge.invoke({
    messages: [
        {
            role: "user",
            content:
                "Me encantaría unas vacaciones de una semana en algún lugar con gran comida e historia. Mi presupuesto es de alrededor de $2500.",
        },
    ],
});

console.log("=== Respuesta de Alex, el Conserje ===");
console.log(result.messages[result.messages.length - 1].content);
