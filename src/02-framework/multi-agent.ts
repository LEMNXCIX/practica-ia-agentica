import { tool } from "@langchain/core/tools";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { context } from "@langchain/core/utils/context";

const MODEL = "gpt-oss:120b-cloud";

const model = new ChatOllama({
    model: MODEL,
    temperature: 0,
});

const retrieveTool = tool(
    async ({ query }: { query: string }) => {
        return `Datos consolidados de ventas del Q4 para [${query}] - Ingresos totales: $2.5M. Canal Online: $1.8M. Tiendas Físicas: $700K.`;
    },
    {
        name: "retrieve_data",
        description:
            "Recupera datos financieros históricos del almacén de datos.",
        schema: z.object({
            query: z
                .string()
                .describe("Término o período de búsqueda de datos"),
        }),
    },
);

const analyzeTool = tool(
    async ({ rawData }: { rawData: string }) => {
        return `Análisis de Rendimiento Q4:\n- Los ingresos superaron la meta en un +15%.\n- Desglose: El canal digital representa el 72% del total, consolidándose como líder comercial.\n- Datos analizados: ${rawData}`;
    },
    {
        name: "analyze_data",
        description:
            "Analiza e interpreta un bloque de datos financieros brutos.",
        schema: z.object({
            rawData: z
                .string()
                .describe("El bloque de datos financieros crudos a analizar"),
        }),
    },
);

const agentRetrieve = createReactAgent({
    llm: model,
    tools: [retrieveTool],
    messageModifier:
        "Eres un agente de recuperación. Tu único trabajo es buscar datos financieros exactos usando retrieve_data. No inventes datos.",
});

const agentAnalyze = createReactAgent({
    llm: model,
    tools: [analyzeTool],
    messageModifier:
        "Eres un analista financiero experto. Tu trabajo es interpretar los datos consolidados usando analyze_data para extraer insights estratégicos.",
});

async function runFinancialPipeline(request: string) {
    console.log(
        `[Coordinador] Iniciando flujo secuencial para: "${request}"\n`,
    );

    // Paso 1: El Agente Recuperador obtiene los datos brutos
    const step1 = await agentRetrieve.invoke({
        messages: [{ role: "user", content: request }],
    });
    const recoveredData = step1.messages[step1.messages.length - 1].content;
    console.log(`[Agente Recuperador] Datos recuperados con éxito.`);

    // Paso 2: Pasamos los datos obtenidos al Agente Analista
    const step2 = await agentAnalyze.invoke({
        messages: [
            {
                role: "user",
                content: `Analiza e interpreta los siguientes datos financieros:\n${recoveredData}`,
            },
        ],
    });

    console.log(`[Agente Analista] Análisis completado.\n`);
    console.log("=== INFORME FINAL DE NEGOCIOS ===");
    console.log(step2.messages[step2.messages.length - 1].content);
}

await runFinancialPipeline("Recupera las ventas del Q4");
