import { tool } from "@langchain/core/tools";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

const MODEL = "gpt-oss:120b-cloud";

const getDestinations = tool(
    async () => {
        // Simulamos una base de datos de destinos turísticos
        return [
            "Barcelona (playa y sol)",
            "París (cultura y romance)",
            "Berlín (historia y arte urbano)",
            "Tokio (tecnología y comida exótica)",
            "Sídney (playa y surf)",
            "El Cairo (pirámides e historia antigua)",
            "Río de Janeiro (playa y carnaval)",
            "Bali (naturaleza y relajación en playas)",
        ];
    },
    {
        name: "obtener_destinos",
        description:
            "Obtiene la lista oficial de destinos de vacaciones populares disponibles.",
        schema: z.object({}), // No requiere parámetros de entrada
    },
);

//:Aqui se inicializa el modelo
const model = new ChatOllama({
    model: MODEL,
    temperature: 0.2,
});

//Asi se inicializa el agente
const agent = createReactAgent({
    llm: model,
    tools: [getDestinations],
});

const response = await agent.invoke({
    messages: [
        {
            role: "user",
            content:
                "Busco un destino con playa calido ademas no se otros idiomas, de la lista de destinos disponibles que me recomiendas?",
        },
    ],
});
//El modelo si usa la tool pero no se encuentra en el ultimo objeto del response por que es la respuesta
//que recibe el usuario, ejecuta la tool en el razonamiento
//console.log(response);
const lastMessage = response.messages[response.messages.length - 1];
console.log("===============");
console.log(lastMessage.content);
