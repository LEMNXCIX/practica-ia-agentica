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

async function searchFlights(preferences: UserPreferences) {
  return [{ flight: "AF123", price: 520.36 }];
}

async function searchHotels(preferences: UserPreferences) {
  return [{ hotel: "Grand Hotel PARIS", price: 150.25 }];
}

async function searchAttractions(preferences: UserPreferences) {
  return [
    "Musée du Louvre",
    "Louvre Museum",
    "Musée d'Orsay",
    "Tour Eiffel",
    "",
  ];
}

function createItinerary(flights: any[], hotels: any[], attractions: string[]) {
  return {
    flights,
    hotels,
    attractions,
  };
}

function adjustPreferences(
  preferences: UserPreferences,
  feedback: UserFeedback,
): UserPreferences {
  return {
    ...preferences,
    favorites: [...(preferences.favorites || []), ...feedback.liked],
    avoid: [...(preferences.avoid || []), ...feedback.disliked],
  };
}

class TravelAgent {
  private userPreferences: UserPreferences = {} as UserPreferences;
  private experienceData: UserFeedback[] = [];

  gatherPreferences(preferences: UserPreferences) {
    this.userPreferences = preferences;
  }

  gatherExperience(feedback: UserFeedback) {
    this.experienceData.push(feedback);
  }

  async retrieveInformation() {
    const flights = await searchFlights(this.userPreferences);
    const hotels = await searchHotels(this.userPreferences);
    const attractions = await searchAttractions(this.userPreferences);
    return { flights, hotels, attractions };
  }
  async generateRecommendations() {
    const { flights, hotels, attractions } = await this.retrieveInformation();
    const itinerary = createItinerary(flights, hotels, attractions);
    return itinerary;
  }
  adjustBasedOnFeedback(feedback: UserFeedback) {
    this.experienceData.push(feedback);
    this.userPreferences = adjustPreferences(this.userPreferences, feedback);
  }
}

class PlanningTravelAgent {
  private userPreferences: UserPreferences = {} as UserPreferences;
  private experienceData: UserFeedback[] = [];

  gatherPreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }

  async retrieveInformation() {
    const flights = await searchFlights(this.userPreferences);
    const hotels = await searchHotels(this.userPreferences);
    const attractions = await searchAttractions(this.userPreferences);
    return { flights, hotels, attractions };
  }

  async generateRecommendations() {
    const { flights, hotels, attractions } = await this.retrieveInformation();
    const itinerary = createItinerary(flights, hotels, attractions);
    return itinerary;
  }

  adjustBasedOnFeedback(feedback: UserFeedback): void {
    this.experienceData.push(feedback);
    this.userPreferences = adjustPreferences(this.userPreferences, feedback);
  }
}

class CorrectiveRAGTravelAgent {
  private userPreferences: UserPreferences = {} as UserPreferences;
  private experienceData: UserFeedback[] = [];

  gatherPreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }

  async retrieveInformation() {
    const flights = await searchFlights(this.userPreferences);
    const hotels = await searchHotels(this.userPreferences);
    const attractions = await searchAttractions(this.userPreferences);
    return { flights, hotels, attractions };
  }

  async generateRecommendations() {
    const { flights, hotels, attractions } = await this.retrieveInformation();
    const itinerary = createItinerary(flights, hotels, attractions);
    return itinerary;
  }

  async adjustBasedOnFeedback(feedback: UserFeedback) {
    this.experienceData.push(feedback);
    this.userPreferences = adjustPreferences(this.userPreferences, feedback);
    const newItinerary = await this.generateRecommendations();
    return newItinerary;
  }
}

(async () => {
  //const travelAgent = new TravelAgent();
  // const travelAgent = new PlanningTravelAgent();
  const travelAgent = new CorrectiveRAGTravelAgent();
  const preferences: UserPreferences = {
    destination: "Paris",
    dates: "2025-04-01 to 2025-04-10",
    budget: "moderate",
    interests: ["museums", "cuisine"],
  };
  travelAgent.gatherPreferences(preferences);
  const itinerary = await travelAgent.generateRecommendations();
  console.log("Suggested Itinerary:", itinerary);

  const feedback: UserFeedback = {
    liked: ["Musée du Louvre"],
    disliked: ["Eiffel Tower (too crowded)"],
  };
  const newItinerary = await travelAgent.adjustBasedOnFeedback(feedback);
  console.log("Updated Itinerary:", newItinerary);
})();

interface DestinationDetails {
  country: string;
  currency: string;
  language: string;
  attractions: string[];
}

class PreemptiveContextTravelAgent {
  private context: Record<string, DestinationDetails>;

  constructor() {
    // Pre-cargar destinos populares y su información
    this.context = {
      Paris: {
        country: "France",
        currency: "Euro",
        language: "French",
        attractions: ["Eiffel Tower", "Louvre Museum"],
      },
      Tokyo: {
        country: "Japan",
        currency: "Yen",
        language: "Japanese",
        attractions: ["Tokyo Tower", "Shibuya Crossing"],
      },
      "New York": {
        country: "USA",
        currency: "Dollar",
        language: "English",
        attractions: ["Statue of Liberty", "Times Square"],
      },
      Sydney: {
        country: "Australia",
        currency: "Dollar",
        language: "English",
        attractions: ["Sydney Opera House", "Bondi Beach"],
      },
    };
  }

  getDestinationInfo(destination: string): string {
    // Obtener información del destino desde el contexto pre-cargado
    const info = this.context[destination];
    if (info) {
      return `${destination}:\nCountry: ${info.country}\nCurrency: ${info.currency}\nLanguage: ${info.language}\nAttractions: ${info.attractions.join(", ")}`;
    } else {
      return `Sorry, we don't have information on ${destination}.`;
    }
  }
}

// Ejemplo de uso
const travelAgent = new PreemptiveContextTravelAgent();
console.log("PreemptiveContextTravelAgent");
console.log(travelAgent.getDestinationInfo("Paris"));
console.log(travelAgent.getDestinationInfo("Tokyo"));
