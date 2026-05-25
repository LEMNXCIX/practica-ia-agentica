import {
    StateGraph,
    MessagesAnnotation,
    MemorySaver,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

// Inicialización del modelo local
const model = new ChatOllama({ model: "gpt-oss:120b-cloud", temperature: 0 });

// Definir nodo del agente
const agentNode = async (state: typeof MessagesAnnotation.State) => {
    const response = await model.invoke([
        { role: "system", content: "You are a helpful assistant." },
        ...state.messages,
    ]);
    return { messages: [response] };
};

// Construir el grafo
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

// Compilar con checkpoint (persistencia local)
const graph = workflow.compile({ checkpointer: new MemorySaver() });

// Ejecutar con thread_id para contexto persistente
const result = await graph.invoke(
    { messages: [{ role: "user", content: "Hello, World!" }] },
    { configurable: { thread_id: "sesion-1" } },
);
console.log(result.messages[result.messages.length - 1].content);
