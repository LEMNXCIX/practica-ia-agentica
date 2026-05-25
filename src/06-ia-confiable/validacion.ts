import { tool } from "@langchain/core/tools";
import z from "zod";

function containInjection(text: string) {
    const dangerousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /system\s*:/i,
        /you\s+are\s+now/i,
        /jailbreak/i,
        /disregard\s+all/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(text));
}

const userQuerySchema = z.object({
    query: z
        .string()
        .min(3, "La consulta debe tener al menos 3 caracteres")
        .max(500, "La consulta no puede exceder los 500 caracteres")
        .refine(
            (val) => !containInjection(val),
            "La consulta posee patrones potencialmente peligrosos",
        ),
});

// Herramienta con validación de seguridad integrada
const safeSearchTool = tool(
    async ({ query }: { query: string }) => {
        // La validación lanza un error si la consulta falla — LangGraph lo captura
        const validated = userQuerySchema.parse({ query });
        return `Resultados para: ${validated.query}`;
    },
    {
        name: "safe_search",
        description:
            "Búsqueda con validación de seguridad contra inyección de prompts",
        schema: z.object({ query: z.string() }),
    },
);
