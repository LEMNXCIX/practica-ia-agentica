import "dotenv/config";
import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

interface TestCase {
    input: string;
    expectedToolCalls?: string[];
    expectedKeywords: string[];
}

// Definir casos de prueba
const testCases: TestCase[] = [
    {
        input: "Busca vuelos a París para la próxima semana",
        expectedKeywords: ["París", "vuelo"],
    },
    {
        input: "Reserva el hotel más barato en Tokio",
        expectedKeywords: ["hotel", "Tokio", "reserva"],
    },
    {
        input: "¿Cuál es el clima en Londres?",
        expectedKeywords: ["Londres", "clima"],
    },
];

// Ejecutar evaluación
async function evaluateAgent(agentApp: any) {
    const results = [];

    for (const test of testCases) {
        const result = await agentApp.invoke(
            { messages: [{ role: "user", content: test.input }] },
            { configurable: { thread_id: `eval-${Date.now()}` } },
        );

        const response = result.messages[result.messages.length - 1]
            .content as string;
        const hasKeywords = test.expectedKeywords.some((kw) =>
            response.toLowerCase().includes(kw.toLowerCase()),
        );

        results.push({
            input: test.input,
            passed: hasKeywords,
            response: response.substring(0, 200),
        });
    }

    const passRate = results.filter((r) => r.passed).length / results.length;
    console.log(`Tasa de aprobación: ${(passRate * 100).toFixed(1)}%`);

    return results;
}
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

evaluateAgent(app);
