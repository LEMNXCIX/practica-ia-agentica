interface TravelItem {
    name: string;
    category: string;
    price: number;
    location: string;
    relevance?: number;
}

interface Query {
    interests: string[];
    budget: number;
    destination: string;
}
interface UserPreferences {
    destination: string;
    dates: string;
    budget: string;
    interests: string[];
    favorites?: string[];
    avoid?: string[];
}

interface UserFeedback {
    liked?: string[];
    disliked?: string[];
}
function relevanceScore(item: TravelItem, query: Query): number {
    let score = 0;
    if (query.interests.includes(item.category)) score += 1;
    if (item.price <= query.budget) score += 1;
    if (item.location === query.destination) score += 1;
    return score;
}

function filterAndRank(items: TravelItem[], query: Query): TravelItem[] {
    return items
        .map((item) => ({ ...item, relevance: relevanceScore(item, query) }))
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
        .slice(0, 10);
}

function adjustBasedOnFeedback(
    feedback: UserFeedback,
    items: TravelItem[],
): TravelItem[] {
    return items.map((item) => {
        const updated = { ...item };
        if (feedback.liked.includes(item.name))
            updated.relevance = (updated.relevance || 0) + 1;
        if (feedback.disliked.includes(item.name))
            updated.relevance = (updated.relevance || 0) - 1;
        return updated;
    });
}

class RelevanceEvaluationTravelAgent {
    private userPreferences: Query = {} as Query;

    gatherPreferences(preferences: Query): void {
        this.userPreferences = preferences;
    }

    async retrieveInformation() {
        const flights: TravelItem[] = [
            {
                name: "Flight AF123",
                category: "flights",
                price: 850,
                location: "Paris",
            },
            {
                name: "Flight IB456",
                category: "flights",
                price: 600,
                location: "Paris",
            },
        ];
        const hotels: TravelItem[] = [
            {
                name: "Grand Hotel",
                category: "hotels",
                price: 200,
                location: "Paris",
            },
            {
                name: "Budget Inn",
                category: "hotels",
                price: 80,
                location: "Paris",
            },
        ];
        return { flights, hotels };
    }

    async generateRecommendations() {
        const { flights, hotels } = await this.retrieveInformation();
        const rankedHotels = filterAndRank(hotels, this.userPreferences);
        return { flights, hotels: rankedHotels };
    }
}

// Ejemplo de uso
(async () => {
    const agent = new RelevanceEvaluationTravelAgent();
    agent.gatherPreferences({
        interests: ["hotels"],
        budget: 150,
        destination: "Paris",
    });
    const recommendations = await agent.generateRecommendations();
    console.log(
        "Recomendaciones de hoteles puntuadas:",
        recommendations.hotels,
    );
})();

function identifyIntent(
    query: string,
): "informational" | "navigational" | "transactional" {
    const lower = query.toLowerCase();
    if (
        lower.includes("book") ||
        lower.includes("purchase") ||
        lower.includes("reservar") ||
        lower.includes("comprar")
    ) {
        return "transactional";
    } else if (
        lower.includes("website") ||
        lower.includes("official") ||
        lower.includes("sitio oficial")
    ) {
        return "navigational";
    } else {
        return "informational";
    }
}

function analyzeContext(query: string, userHistory: string[]) {
    return { currentQuery: query, userHistory };
}

async function searchWithIntent(
    query: string,
    preferences: Record<string, any>,
    userHistory: string[],
): Promise<string[]> {
    const intent = identifyIntent(query);
    let searchResults: string[] = [];

    if (intent === "informational") {
        searchResults = [
            `mejores atracciones en ${preferences.destination}`,
            "Guía turística de París",
        ];
    } else if (intent === "navigational") {
        searchResults = [
            `${preferences.destination} - Portal oficial de turismo`,
        ];
    } else if (intent === "transactional") {
        searchResults = [
            `Reservar vuelo a ${preferences.destination}`,
            `Comprar boletos de tren`,
        ];
    }

    return searchResults
        .filter((result) => !userHistory.includes(result))
        .slice(0, 10);
}

// Ejemplo de uso
(async () => {
    const preferences = { destination: "Paris" };
    const userHistory = ["Book flight to Paris"];
    const results = await searchWithIntent(
        "reservar un viaje a París",
        preferences,
        userHistory,
    );
    console.log("Resultados clasificados e interactuados:", results);
})();
