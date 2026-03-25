import api from "./client";

export const getBookmarks = async () => {
  const response = await api.get("/bookmarks");
  return response.data;
};

export const getAllBookmarkedRecipes = async (sort) => {
  const queryString = sort ? `?sort=${sort}` : '';
  const response = await api.get(`/bookmarks/recipes${queryString}`);
  return response.data;
};

export const bookmarkRecipe = async (recipeId, folderId, rating) => {
  const response = await api.post("/bookmarks", { recipe_id: recipeId, folder_id: folderId, rating });
  return response.data;
};

export const updateBookmark = async (id, rating) => {
  const response = await api.put(`/bookmarks/${id}`, { rating });
  return response.data;
};

export const deleteBookmark = async (id) => {
  const response = await api.delete(`/bookmarks/${id}`);
  return response.data;
};
