import "dotenv/config";
import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({ model: "gpt-oss:120b-cloud", temperature: 0 });

async function agentMode(state: typeof MessagesAnnotation.State) {
    const response = await llm.invoke(state.messages);
    return { messages: response };
}
// USANFO LangSmith
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentMode)
    .addEdge(START, "agent")
    .addEdge("agent", END);
const checkpoiner = new MemorySaver();
const app = workflow.compile({ checkpointer: checkpoiner });

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
