import "dotenv/config";
import { InMemoryCache } from "@langchain/core/caches";
import { ChatOllama } from "@langchain/ollama";

const cache = new InMemoryCache();

const cachedLlm = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0, // temperatura 0 para resultados deterministas
    cache,
});

// La primera llamada ejecuta el LLM
const r1 = await cachedLlm.invoke("¿Cuál es la capital de Francia?");

// La segunda llamada devuelve la respuesta cacheada directamente
const r2 = await cachedLlm.invoke("¿Cuál es la capital de Francia?");
