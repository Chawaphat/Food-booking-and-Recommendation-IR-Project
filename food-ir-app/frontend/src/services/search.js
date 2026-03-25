import api from "./client";

export const searchRecipes = async (query) => {
  const response = await api.post("/search/", { query });
  console.log("Search response:", response.data);
  return response.data;
};

export const getRandomRecipes = async () => {
  const response = await api.get("/recipes/random");
  return response.data;
};

export const getRecipeDetail = async (id) => {
  const response = await api.get(`/search/${id}`);
  return response.data;
};
