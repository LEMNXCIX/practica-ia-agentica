import {
  StateGraph,
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOllama({
  model: "gpt-oss:120b-cloud",
  temperature: 0.1, // Temperatura baja para que el moderador sea preciso con el string de salida
});

const GroupChatState = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentSpeaker: Annotation<string>({ default: () => "" }),
  round: Annotation<number>({ default: () => 0 }),
});

async function flightAgent(state: typeof GroupChatState.State) {
  const response = await model.invoke([
    new SystemMessage(
      "Eres un agente especializado en vuelos. Responde brevemente sobre temas de vuelos. Si el tema no es de tu especialidad, di 'Paso, no es mi especialidad'.",
    ),
    ...state.messages,
  ]);
  return 
    messages: [response],
    currentSpeaker: "moderator", // Devuelve el control al moderador explicitamente si quieres limpiar el speaker
  };
}

async function hotelAgent(state: typeof GroupChatState.State) {
  const response = await model.invoke([
    new SystemMessage(
      "Eres un agente especializado en hoteles. Responde brevemente sobre temas de hoteles. Si el tema no es de tu especialidad, di 'Paso, no es mi especialidad'.",
    ),
    ...state.messages,
  ]);
  return {
    messages: [response],
    currentSpeaker: "moderator",
  };
}

async function moderator(state: typeof GroupChatState.State) {
  const lastMessage = state.messages[state.messages.length - 1];

  // Forzamos un formato ultra estricto para modelos locales
  const response = await model.invoke([
    // En el prompt del Moderador:
    new SystemMessage(
      `Decide qué agente debe hablar a continuación basándote en el último mensaje.
    Opciones válidas: "flight_agent" o "hotel_agent".
    Si el tema no encaja en ninguno, asígnalo al azar a cualquiera de los dos.
    Responde ÚNICAMENTE con una de las dos opciones.`,
    ),
    new HumanMessage(`Mensaje a evaluar: "${lastMessage.content}"`),
  ]);

  const decision = (response.content as string).trim().toLowerCase();

  // 🔍 LOG DE DIAGNÓSTICO: Veremos qué está respondiendo realmei   favorite:s [...(preferences.favorites || []), ...feedback.liked],
    avoid: [...(preferences.avoid || []), ...feedback.disliked]nte tu Ollama
  console.log(`\n[DEBUG MODERADOR] El modelo respondió: "${decision}"`);

  return {
    currentSpeaker: decision,
    // Agregamos la respuesta al estado para que no quede vacío si termina
    messages: [response],
  };
}

function routeToSpeaker(state: typeof GroupChatState.State) {
  const speaker = state.currentSpeaker;

  // 🔍 LOG DE DIAGNÓSTICO: Veremos qué camino decide tomar el grafo
  console.log(`[DEBUG ROUTER] Evaluando speaker: "${speaker}"`);

  if (speaker.includes("flight_agent")) return "flight_agent";
  if (speaker.includes("hotel_agent")) return "hotel_agent";

  console.log(
    "[DEBUG ROUTER] No coincide con nadie. Saliendo del grafo vía __end__",
  );
  return "__end__";
}

const groupChat = new StateGraph(GroupChatState)
  .addNode("moderator", moderator)
  .addNode("flight_agent", flightAgent)
  .addNode("hotel_agent", hotelAgent)
  .addEdge("__start__", "moderator")
  .addConditionalEdges("moderator", routeToSpeaker, {
    flight_agent: "flight_agent",
    hotel_agent: "hotel_agent",
    __end__: "__end__",
  })
  .addEdge("flight_agent", "moderator")
  .addEdge("hotel_agent", "moderator")
  .compile();

(async () => {
  const config = { configurable: { thread_id: "rag_demo_thread" } };
  const result = await groupChat.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "¿Cuáles son las proyecciones de crecimiento y ventas de la empresa?",
        },
      ],
    },
    config,
  );

  console.log(
    "Respuesta final del grafo:",
    result.messages[result.messages.length - 1].content,
  );
})();
