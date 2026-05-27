import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import z from "zod";

const transferToBilling = tool(
  async ({ resaon }: { resaon: string }) =>
    `transferência para billing: ${resaon}`,
  {
    name: "transfer_to_billing",
    description: "Trasfiere la conversacion al agente de billing",
    schema: z.object({
      resaon: z
        .string()
        .describe(
          "Razón por la cual se debe transferir la conversación al agente de billing",
        ),
    }),
  },
);

const trasferToSupport = tool(
  async ({ resaon }: { resaon: string }) =>
    `transferência para support: ${resaon}`,
  {
    name: "transfer_to_support",
    description: "Trasfiere la conversacion al agente de support",
    schema: z.object({
      resaon: z
        .string()
        .describe(
          "Razón por la cual se debe transferir la conversación al agente de support",
        ),
    }),
  },
);

const routerTools = [transferToBilling, trasferToSupport];

const routerModel = new ChatOllama({
  model: "gpt-oss:120b-cloud",
  temperature: 0,
}).bindTools(routerTools);

const HandOffState = Annotation.Root({
  ...MessagesAnnotation.spec,

  currentAgent: Annotation<string>({ default: () => "router" }),
});

async function routerAgent(state: typeof HandOffState.State) {
  console.log("routing transfer");
  const response = await routerModel.invoke([
    new SystemMessage(
      "Eres un enrutador de soporte al cliente. Decide si transferir a facturación o soporte técnico.",
    ),
    ...state.messages,
  ]);
  return { messages: [response] };
}

async function billingAgent(state: typeof HandOffState.State) {
  console.log("delegando a billingAgent");
  const response = await new ChatOllama({ model: "gpt-oss:120b-cloud" }).invoke(
    [
      new SystemMessage(
        "Eres un agente de facturación. Resuelve problemas de pagos y facturas",
      ),
      ...state.messages,
    ],
  );
  return { messages: [response] };
}

async function supportAgent(state: typeof HandOffState.State) {
  console.log("delegando a supportAgent");
  const response = await new ChatOllama({ model: "gpt-oss:120b-cloud" }).invoke(
    [
      new SystemMessage(
        "Eres un agente de soporte técnico. Resuelve problemas de tecnicos.",
      ),
      ...state.messages,
    ],
  );
  return { messages: [response] };
}

const toolNode = new ToolNode(routerTools);

function routeTransfer(state: typeof HandOffState.State) {
  console.log("routing transfer");
  const lastMsg = state.messages[state.messages.length - 1];
  const toolCalls =
    lastMsg.additional_kwargs?.tool_calls || (lastMsg as any).tool_calls;
  if (toolCalls) {
    const toolName = toolCalls[0]?.function?.name || toolCalls[0]?.name;
    if (toolName === "transfer_to_billing") return "billing";
    if (toolName === "transfer_to_support") return "support";
    return "tools";
  }
  return "__end__";
}

const handOffGraph = new StateGraph(HandOffState)
  .addNode("router", routerAgent)
  .addNode("tools", toolNode)
  .addNode("billing", billingAgent)
  .addNode("support", supportAgent)
  .addEdge("__start__", "router")
  .addConditionalEdges("router", routeTransfer, {
    tools: "tools",
    billing: "billing",
    support: "support",
    __end__: "__end__",
  })
  .addEdge("tools", "router")
  .addEdge("billing", "__end__")
  .addEdge("support", "__end__")
  .compile();

(async () => {
  const config = { configurable: { thread_id: "rag_demo_thread" } };
  const result = await handOffGraph.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "No puedo iniciar sesión en la plataforma. Me sale un error 500 en la pantalla blanca cada vez que intento cargar mi perfil.",
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
