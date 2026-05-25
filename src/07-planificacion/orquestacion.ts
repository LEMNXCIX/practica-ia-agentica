import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
    StateGraph,
    MessagesAnnotation,
    Annotation,
    MemorySaver,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

const IterativePlannerState = Annotation.Root({
    ...MessagesAnnotation.spec,
    previous_plan: Annotation<string>({ default: () => "" }),
    iteration: Annotation<number>({ default: () => 0 }),
});

const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
});

async function replanNode(state: typeof IterativePlannerState.State) {
    const contextNote = state.previous_plan
        ? `\nPlan anterior generado: ${state.previous_plan}\nIteración actual: ${state.iteration + 1}`
        : "";

    const response = await model.invoke([
        new SystemMessage(
            `Eres un planificador iterativo de viajes. Tu trabajo es optimizar el plan
          basándote en la retroalimentación del usuario y el plan anterior.${contextNote}
          Disponibles: flight_booking, hotel_booking, car_rental, activities_booking,
          destination_info, default_agent.`,
        ),
        ...state.messages,
    ]);

    return {
        messages: [response],
        previous_plan: response.content as string,
        iteration: state.iteration + 1,
    };
}

const iterativeGraph = new StateGraph(IterativePlannerState)
    .addNode("replan", replanNode)
    .addEdge("__start__", "replan")
    .addEdge("replan", "__end__")
    .compile({ checkpointer: new MemorySaver() });

const thread = { configurable: { thread_id: "travel_plan" } };

// Turno 1: plan inicial
const turn1 = await iterativeGraph.invoke(
    {
        messages: [
            new HumanMessage(
                "Crea un plan de viaje para una familia con 10 ninos para un paseo escolar",
            ),
        ],
    },
    thread,
);
console.log("Plan inicial:", turn1.messages[turn1.messages.length - 1].content);

// Turno 2: replanificación con retroalimentación del usuario
const turn2 = await iterativeGraph.invoke(
    {
        messages: [
            new HumanMessage(
                "Prefiero vuelos de mañana y hoteles más económicos",
            ),
        ],
    },
    thread, // mismo thread_id → el agente recuerda el plan anterior
);
console.log(
    "Plan optimizado:",
    turn2.messages[turn2.messages.length - 1].content,
);
