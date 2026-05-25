import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Herramienta para groundear las recomendaciones con datos reales
const getDestinationDetails = tool(
    async ({ destination }: { destination: string }) => {
        const details: Record<string, string> = {
            Barcelona:
                "Disponible. Mejor época: Mayo-Junio. Playa, gastronomía catalana e historia. Presupuesto: ~$2000/semana",
            Tokyo: "Disponible. Mejor época: Marzo-Abril. Cultura ancestral, templos, comida increíble. Presupuesto: ~$2500/semana",
            "Cape Town":
                "No disponible. Mejor época: Noviembre-Marzo. Naturaleza, viñedos y aventura. Presupuesto: ~$1800/semana",
        };
        return (
            details[destination] ??
            `${destination}: No hay datos de disponibilidad en este momento.`
        );
    },
    {
        name: "get_destination_details",
        description:
            "Busca detalles reales y disponibilidad de un destino vacacional específico.",
        schema: z.object({
            destination: z.string().describe("El nombre de la ciudad a buscar"),
        }),
    },
);

// Esquema Zod para la recomendación individual (Equivalente al Pydantic BaseModel)
const DestinationRecommendationSchema = z.object({
    destination: z.string().describe("Nombre de la ciudad recomendada"),
    available: z
        .boolean()
        .describe(
            "Si está actualmente disponible para reservas de hotel y vuelos",
        ),
    bestSeason: z.string().describe("La mejor época del año para visitar"),
    highlights: z
        .array(z.string())
        .describe(
            "Lista de las 3 atracciones principales o puntos destacados del lugar",
        ),
    estimatedBudgetUsd: z
        .number()
        .int()
        .describe(
            "Presupuesto de viaje estimado en dólares estadounidenses para una semana",
        ),
});

// Esquema Zod de salida global para la API
const TravelRecommendationsSchema = z.object({
    recommendations: z
        .array(DestinationRecommendationSchema)
        .describe("Lista de recomendaciones sugeridas"),
    personalizedNote: z
        .string()
        .describe(
            "Mensaje personalizado explicando por qué estos destinos coinciden con su presupuesto y gustos",
        ),
});

// Configuración del modelo estructurado
const model = new ChatOllama({
    model: "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M",
    temperature: 0,
});

// Forzamos al modelo a devolver datos garantizados bajo el esquema de Zod
const structuredLlm = model.withStructuredOutput(TravelRecommendationsSchema);

// Ejecución
const prompt =
    "Recomienda 3 destinos para un viajero amante de la cultura y la comida con un presupuesto de $2500. Usa Barcelona, Tokyo y Cape Town.";
const structuredResponse = await structuredLlm.invoke(prompt);

console.log("=== Datos Estructurados Recibidos (Garantía Zod) ===");
console.log(JSON.stringify(structuredResponse, null, 2));
