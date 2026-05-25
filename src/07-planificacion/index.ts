import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
    Annotation,
    MessagesAnnotation,
    StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import z from "zod";
import { object } from "zod/v3";

const agentRole = z.enum([
  "flight_booking",
  "hotel_booking",
  "car_rental",
  "activities_booking",
  "destination_info",
  "default_agent",
]);

const TravelSubTask = z.object({
    task_details: z.string().describe("Descipcion de la subtarea"),
    assigned_agent: agentRole.describe("Agente asignado para la subtarea"),
});

const TravelPlan = z.object({
    main_task: z.string().describe("Descripcion de la tarea principal"),
    subtasks: z.array(TravelSubTask).describe("Lista de subtareas desglozadas"),
    is_greeting: z
        .boolean()
        .describe("Indica si la tarea principal es una saludo"),
});

const PlannerState = Annotation.Root({
    ...MessagesAnnotation.spec,
  plan: Annotation<z.infer<typeof TravelPlan> | null>({
    value: (_prev, next) => next,
    default: () => null,
  }),

});
const model = new ChatOllama({
    model: "gpt-oss:120b-cloud",
    temperature: 0,
});

const systemPrompt = `Eres un agente planificador.
Tu trabajo es decidir qué agentes ejecutar basándote en la solicitud del usuario.
Proporciona tu respuesta ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "main_task": "Planificar un viaje familiar de Singapur a Melbourne.",
  "subtasks": [
    {"assigned_agent": "flight_booking", "task_details": "Reservar vuelos ida y vuelta de Singapur a Melbourne."},
    {"assigned_agent": "hotel_booking", "task_details": "Encontrar hoteles familiares en Melbourne."}
  ],
  "is_greeting": false
}

Agentes disponibles:
- flight_booking: Reservar vuelos e información de vuelos
- hotel_booking: Reservar hoteles e información de hoteles
- car_rental: Reservar autos e información de alquiler
- activities_booking: Reservar actividades e información de actividades
- destination_info: Información sobre destinos turísticos
- default_agent: Solicitudes generales`;

async function plannerNode(state: typeof PlannerState.State) {
  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);
  try {
    let raw = response.content as string;

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) raw = jsonMatch[1].trim();
    const plan = TravelPlan.parse(JSON.parse(raw));
    return { messages: [response], plan };
  } catch (e) {
    console.error("Error parseando plan:", e);
    return { messages: [response], plan: null };
  }
}


const plannerGraph = new StateGraph(PlannerState)
  .addNode("planner", plannerNode)
  .addEdge("__start__", "planner")
  .addEdge("planner", "__end__")
  .compile();

const result = await plannerGraph.invoke({
  messages: [new HumanMessage("Crea un plan de viaje para una familia con 2 niños de Singapur a Melbourne")],
});

console.log("Plan generado:", JSON.stringify(result.plan, null, 2));
