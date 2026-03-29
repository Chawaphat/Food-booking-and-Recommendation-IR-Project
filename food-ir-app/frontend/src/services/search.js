import api from "./client";

/**
 * Search for recipes.
 *
 * Returns:
 *   {
 *     results:         Recipe[],
 *     suggestions:     string[],      // spell-correction alternatives
 *     corrected_query: string | null, // best corrected query (null = no typo)
 *   }
 */
export const searchRecipes = async (query) => {
  const response = await api.post("/search/", { query });
  const data = response.data;

  // Handle both old (array) and new (object) response shapes for safety
  if (Array.isArray(data)) {
    return { results: data, suggestions: [], corrected_query: null };
  }
  return {
    results:         data.results         ?? [],
    suggestions:     data.suggestions     ?? [],
    corrected_query: data.corrected_query ?? null,
  };
};

export const getRandomRecipes = async () => {
  const response = await api.get("/recipes/random");
  return response.data;
};

export const getRecipeDetail = async (id) => {
  const response = await api.get(`/search/${id}`);
  return response.data;
};

export const getRecommendations = async () => {
  const response = await api.get("/recommendations");
  return response.data;
};

export const getSimilarRecipes = async (recipeId) => {
  const response = await api.get(`/recipes/${recipeId}/similar`);
  return response.data.similar_recipes ?? [];
};
