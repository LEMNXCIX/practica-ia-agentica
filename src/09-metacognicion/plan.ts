interface Destination {
  name: string;
  cost: number;
  activity: string;
}

class GoalOrientedTravelAgent {
  private destinations: Destination[];

  constructor(destinations: Destination[]) {
    this.destinations = destinations;
  }

  bootstrapPlan(
    preferences: Record<string, string>,
    budget: number,
  ): Destination[] {
    const plan: Destination[] = [];
    let totalCost = 0;

    for (const destination of this.destinations) {
      if (
        totalCost + destination.cost <= budget &&
        this.matchPreferences(destination, preferences)
      ) {
        plan.push(destination);
        totalCost += destination.cost;
      }
    }

    return plan;
  }

  matchPreferences(
    destination: Destination,
    preferences: Record<string, string>,
  ): boolean {
    for (const [key, value] of Object.entries(preferences)) {
      if ((destination as any)[key] !== value) {
        return false;
      }
    }
    return true;
  }

  iteratePlan(
    plan: Destination[],
    preferences: Record<string, string>,
    budget: number,
  ): Destination[] {
    const newPlan = [...plan];
    for (let i = 0; i < newPlan.length; i++) {
      for (const destination of this.destinations) {
        // Optimizar reemplazando un destino por otro que coincida si el costo acumulado lo permite
        if (
          !newPlan.includes(destination) &&
          this.matchPreferences(destination, preferences) &&
          this.calculateCost(newPlan, destination) - newPlan[i].cost <= budget
        ) {
          newPlan[i] = destination;
          break;
        }
      }
    }
    return newPlan;
  }

  calculateCost(plan: Destination[], newDestination: Destination): number {
    return (
      plan.reduce((sum, destination) => sum + destination.cost, 0) +
      newDestination.cost
    );
  }
}

// Ejemplo de uso
const destinations: Destination[] = [
  { name: "Paris", cost: 1000, activity: "sightseeing" },
  { name: "Tokyo", cost: 1200, activity: "shopping" },
  { name: "New York", cost: 900, activity: "sightseeing" },
  { name: "Sydney", cost: 1100, activity: "beach" },
];

const preferences = { activity: "sightseeing" };
const budget = 2000;

const travelAgent = new GoalOrientedTravelAgent(destinations);
const initialPlan = travelAgent.bootstrapPlan(preferences, budget);
console.log("Initial Plan:", initialPlan);

const refinedPlan = travelAgent.iteratePlan(initialPlan, preferences, budget);
console.log("Refined Plan:", refinedPlan);
