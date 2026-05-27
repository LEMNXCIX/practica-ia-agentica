import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  Annotation,
  MessagesAnnotation,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

const model = new ChatOllama({ model: "gpt-oss:120b-cloud", temperature: 0.3 });

const FilteringState = Annotation.Root({
  ...MessagesAnnotation.spec,
  industryAnalysis: Annotation<string, string>({
    default: () => "",
  }),
  technicalAnalysis: Annotation<string, string>({
    default: () => "",
  }),
  fundamentalAnalysis: Annotation<string, string>({
    default: () => "",
  }),
  finalRecommendation: Annotation<string, string>({
    default: () => "",
  }),
});

async function industryExpert(state: typeof FilteringState.State) {
  console.log("Processing industry expert agent");
  const res = await model.invoke([
    new SystemMessage(
      "Eres un experto en análisis de industria. Evalúa la industria de la acción consultada.",
    ),
    ...state.messages,
  ]);
  return { industryAnalysis: res.content as string };
}

async function technicalExpert(state: typeof FilteringState.State) {
  console.log("Processing technical expert agent");
  const res = await model.invoke([
    new SystemMessage(
      "Eres un experto en análisis técnico. Evalúa indicadores técnicos de la acción.",
    ),
    ...state.messages,
  ]);
  return { technicalAnalysis: res.content as string };
}

async function fundamentalExpert(state: typeof FilteringState.State) {
  console.log("Processing fundamental expert agent");
  const res = await model.invoke([
    new SystemMessage(
      "Eres un experto en análisis fundamental. Evalúa la base financiera de la acción.",
    ),
    ...state.messages,
  ]);
  return { fundamentalAnalysis: res.content as string };
}

async function synthesizer(state: typeof FilteringState.State) {
  console.log("Processing synthesizer agent");
  const res = await model.invoke([
    new SystemMessage(
      "Eres un experto en síntesis. Combina los análisis de industria, técnico y fundamental para dar una recomendación final.",
    ),
    new HumanMessage(
      `Industria: ${state.industryAnalysis}\nTécnico: ${state.technicalAnalysis}\nFundamental: ${state.fundamentalAnalysis}`,
    ),
  ]);
  return { finalRecommendation: res.content as string, messages: [res] };
}

const collaborativeGraph = new StateGraph(FilteringState)
  .addNode("industry", industryExpert)
  .addNode("technical", technicalExpert)
  .addNode("fundamental", fundamentalExpert)
  .addNode("synthesizer", synthesizer)
  // Los tres análisis se ejecutan, luego el sintetizador combina
  .addEdge("__start__", "industry")
  .addEdge("__start__", "technical")
  .addEdge("__start__", "fundamental")
  .addEdge("industry", "synthesizer")
  .addEdge("technical", "synthesizer")
  .addEdge("fundamental", "synthesizer")
  .addEdge("synthesizer", "__end__")
  .compile();

(async () => {
  const config = {
    configurable: { thread_id: "agentes_colavorativos_thread" },
  };
  const result = await collaborativeGraph.invoke(
    {
      messages: [
        {
          role: "user",
          content: "Necesito realizar un análisis de la acción MSFT",
        },
      ],
    },
    config,
  );

  console.log(
    "Respuesta final:",
    result.messages[result.messages.length - 1].content,
  );
})();
