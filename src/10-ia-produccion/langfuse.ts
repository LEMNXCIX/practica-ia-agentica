import "dotenv/config";
import { Langfuse } from "langfuse";
import process from "process";

export const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com", // Por si acaso
});

async function ejecutarAgente() {
    // 1. Crear la traza principal
    const trace = langfuse.trace({
        name: "agente_viajes",
        metadata: {
            modelo: "gpt-oss:120b-cloud",
            proveedor: "ollama",
        },
    });

    // 2. Iniciar la generación (llamada al LLM)
    const generation = trace.generation({
        name: "llm_call",
        model: "gpt-oss:120b-cloud",
        input: { messages: [{ role: "user", content: "Busca vuelos" }] },
    });

    // Simulamos que el modelo tarda un momento en responder...
    // (Opcional, solo para que los timestamps no sean idénticos)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. Terminar la generación guardando el output y tokens
    generation.end({
        output: { content: "Encontré 3 vuelos disponibles..." },
        usage: { input: 150, output: 80 },
    });

    // 4. Añadir score de evaluación
    trace.score({ name: "relevancia", value: 0.9 });

    // ==========================================
    // 🔥 LA PIEZA CLAVE PARA SCRIPTS CORTOS 🔥
    // ==========================================
    console.log("Enviando trazas pendientes a Langfuse...");
    await langfuse.flushAsync();
    console.log("¡Todo enviado! Ya puedes revisar tu dashboard.");
}

// Ejecutamos la función
ejecutarAgente().catch((err) => console.error("Error en el script:", err));
