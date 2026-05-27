import { ChatOllama } from "@langchain/ollama";

interface ScoredDestination {
  name: string;
  description: string;
}

class LLMRankingTravelAgent {
  private destinations: ScoredDestination[];
  private llm: ChatOllama;

  constructor(destinations: ScoredDestination[]) {
    this.destinations = destinations;
    this.llm = new ChatOllama({
      model: "gpt-oss:120b-cloud",
      temperature: 0.1,
    });
  }

  async getRecommendations(
    preferences: Record<string, string>,
  ): Promise<string[]> {
    const prompt = this.generatePrompt(preferences);
    const response = await this.llm.invoke([
      {
        role: "system",
        content:
          "Eres un agente de recomendación. Tu tarea es puntuar y ordenar destinos de viaje según las preferencias del usuario.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    return (response.content as string).trim().split("\n");
  }

  private generatePrompt(preferences: Record<string, string>): string {
    let prompt =
      "Rank and score the following travel destinations from 1 to 10 based on these user preferences:\n";
    for (const [key, value] of Object.entries(preferences)) {
      prompt += `${key}: ${value}\n`;
    }
    prompt += "\nDestinations:\n";
    for (const destination of this.destinations) {
      prompt += `- ${destination.name}: ${destination.description}\n`;
    }
    return prompt;
  }
}

(async () => {
  const destinations: ScoredDestination[] = [
    {
      name: "Paris",
      description: "City of lights, known for its art, fashion, and culture.",
    },
    {
      name: "Tokyo",
      description:
        "Vibrant city, famous for its modernity and traditional temples.",
    },
    {
      name: "New York",
      description:
        "The city that never sleeps, with iconic landmarks and diverse culture.",
    },
    {
      name: "Sydney",
      description:
        "Beautiful harbour city, known for its opera house and stunning beaches.",
    },
  ];

  const preferences = { activity: "sightseeing", culture: "diverse" };
  const travelAgent = new LLMRankingTravelAgent(destinations);

  const recommendations = await travelAgent.getRecommendations(preferences);
  console.log("Recommended Destinations:");
  recommendations.forEach((rec) => console.log(rec));
})();  
