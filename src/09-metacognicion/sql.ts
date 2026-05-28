import Database from "better-sqlite3";

// Crear base de datos en memoria para propósitos didácticos
const db = new Database(":memory:");

// Crear tablas e insertar datos simulados
db.exec(`
  CREATE TABLE flights (destination TEXT, dates TEXT, budget TEXT, price REAL);
  CREATE TABLE hotels (destination TEXT, budget TEXT, price REAL, name TEXT);
  CREATE TABLE attractions (destination TEXT, interests TEXT, name TEXT);

  INSERT INTO flights VALUES ('Paris', '2025-04-01 to 2025-04-10', 'moderate', 550.0);
  INSERT INTO hotels VALUES ('Paris', 'moderate', 120.0, 'Grand Hotel');
  INSERT INTO attractions VALUES ('Paris', 'museums', 'Louvre Museum');

  INSERT INTO flights VALUES ('Quito', '2026-04-01 to 2026-04-10', 'low', 25.0);
  INSERT INTO hotels VALUES ('Quito', 'low', 120.0, 'Grand Hotel q');
  INSERT INTO attractions VALUES ('Quito', 'museums', 'Basilica');
`);

class SQLRAGAgent {
    private userPreferences: Record<string, string> = {};

    gatherPreferences(preferences: Record<string, string>): void {
        this.userPreferences = preferences;
    }
}

function generateSQLQuery(
    table: string,
    preferences: Record<string, string>,
): string {
    const conditions = Object.entries(preferences)
        .map(([key, value]) => `${key}='${value}'`)
        .join(" AND ");
    return `SELECT * FROM ${table} WHERE ${conditions}`;
}

function executeSQLQuery(query: string): any[] {
    const stmt = db.prepare(query);
    return stmt.all();
}

function generateRecommendations(preferences: Record<string, string>) {
    const flightQuery = generateSQLQuery("flights", {
        destination: preferences.destination,
        budget: preferences.budget,
    });
    const hotelQuery = generateSQLQuery("hotels", {
        destination: preferences.destination,
        budget: preferences.budget,
    });
    const attractionQuery = generateSQLQuery("attractions", {
        destination: preferences.destination,
    });

    const flights = executeSQLQuery(flightQuery);
    const hotels = executeSQLQuery(hotelQuery);
    const attractions = executeSQLQuery(attractionQuery);

    return { flights, hotels, attractions };
}

// Ejemplo de uso
const preferences = {
    destination: "Quito",
    dates: "2025-04-01 to 2025-04-10",
    budget: "low",
    interests: "museums",
};
const itinerary = generateRecommendations(preferences);
console.log("Itinerario estructurado por consulta SQL-RAG:", itinerary);

interface Hotel {
    name: string;
    price: number;
    quality: number;
}

class HotelRecommendationAgent {
    private previousChoices: Array<{ strategy: string; hotel: Hotel }> = [];
    private correctedChoices: Array<{ strategy: string; hotel: Hotel }> = [];
    private strategies: string[] = ["cheapest", "highest_quality"];

    recommendHotel(hotels: Hotel[], strategy: string): Hotel {
        let recommended: Hotel;

        if (strategy === "cheapest") {
            recommended = hotels.reduce((min, h) =>
                h.price < min.price ? h : min,
            );
        } else if (strategy === "highest_quality") {
            recommended = hotels.reduce((max, h) =>
                h.quality > max.quality ? h : max,
            );
        } else {
            throw new Error(`Estrategia desconocida: ${strategy}`);
        }

        this.previousChoices.push({ strategy, hotel: recommended });
        return recommended;
    }

    reflectOnChoice(): string {
        if (this.previousChoices.length === 0) {
            return "No choices made yet.";
        }

        const lastChoice =
            this.previousChoices[this.previousChoices.length - 1];
        const userFeedback = this.getUserFeedback(lastChoice.hotel);

        if (userFeedback === "bad") {
            const newStrategy =
                lastChoice.strategy === "cheapest"
                    ? "highest_quality"
                    : "cheapest";
            this.correctedChoices.push({
                strategy: newStrategy,
                hotel: lastChoice.hotel,
            });
            return `Reflecting on choice. Adjusting strategy to ${newStrategy}.`;
        }

        return "The choice was good. No need to adjust.";
    }

    private getUserFeedback(hotel: Hotel): "good" | "bad" {
        if (hotel.price < 100 || hotel.quality < 7) {
            return "bad";
        }
        return "good";
    }
}

// Simular una lista de hoteles (precio y calidad)
const hotels: Hotel[] = [
    { name: "Budget Inn", price: 80, quality: 6 },
    { name: "Comfort Suites", price: 120, quality: 8 },
    { name: "Luxury Stay", price: 200, quality: 9 },
];

// Crear el agente
const agent = new HotelRecommendationAgent();

// Paso 1: Recomendar hotel con la estrategia "más barato"
const recommendedHotel = agent.recommendHotel(hotels, "cheapest");
console.log(`Recommended hotel (cheapest): ${recommendedHotel.name}`); // Debería dar Budget Inn

// Paso 2: Reflexionar y ajustar
const reflectionResult = agent.reflectOnChoice();
console.log(reflectionResult); // Detecta calidad < 7, cambia estrategia a highest_quality

// Paso 3: Recomendar con la estrategia ajustada
const adjustedRecommendation = agent.recommendHotel(hotels, "highest_quality");
console.log(
    `Adjusted hotel recommendation (highest_quality): ${adjustedRecommendation.name}`,
); // Luxury Stay
