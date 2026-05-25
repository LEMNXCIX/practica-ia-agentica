// gpt-oss:120b-cloud
// hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M
// qwen3.5:cloud
import { ChatOllama } from "@langchain/ollama";

const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
});
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getCurrentTime = tool(
    async ({ location }: { location: string }) => {
        const timezones: Record<string, string> = {
            "san francisco": "America/Los_Angeles",
            madrid: "Europe/Madrid",
            bogota: "America/Bogota",
            "buenos aires": "America/Argentina/Buenos_Aires",
        };
        const tz = timezones[location.toLowerCase()];
        if (!tz)
            return JSON.stringify({ location, current_time: "desconocido" });

        const time = new Date().toLocaleTimeString("es-ES", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
        });
        return JSON.stringify({ location, current_time: time });
    },
    {
        name: "get_current_time",
        description: "Obtiene la hora actual en una ubicación dada",
        schema: z.object({
            location: z
                .string()
                .describe(
                    "El nombre de la ciudad, ej. San Francisco, Madrid, Bogota",
                ),
        }),
    },
);

const tools = [getCurrentTime];
const modelWithTools = model.bindTools(tools);

// 1. Mensaje inicial del usuario
const messages = [{ role: "user", content: "¿Qué hora es en San Francisco?" }];

// 2. Primera llamada: Pedir al modelo que decida si usar la herramienta
const response = await modelWithTools.invoke(messages);
console.log(
    "Respuesta inicial del modelo (con tool_calls):",
    JSON.stringify(response.tool_calls, null, 2),
);

// 3. Ejecución manual del código de la herramienta si el LLM lo solicita
if (response.tool_calls && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0] as any;

    if (toolCall.name === "get_current_time") {
        // Ejecutar la función con los argumentos generados por el LLM
        console.log("Ejecutando herramienta:", toolCall.args);

        const toolResult = await getCurrentTime.invoke(toolCall.args);

        // Guardar el mensaje asistente y el resultado de la herramienta en el historial
        console.log("Resultado de la herramienta:", response);
        messages.push(response as any);
        messages.push({
            role: "tool",
            name: toolCall.name,
            content: toolResult,
            tool_call_id: toolCall.id,
        } as any);

        // 4. Segunda llamada: Enviar todo el historial al LLM para la respuesta final
        const finalResponse = await modelWithTools.invoke(messages);
        console.log("Respuesta final del modelo:", finalResponse.content);
    }
} else {
    console.log("El modelo no decidió llamar a ninguna herramienta.");
}
