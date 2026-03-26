import api from "./client";

export const getFolders = async () => {
  const response = await api.get("/folders");
  return response.data;
};

export const createFolder = async (name) => {
  const response = await api.post("/folders", { name });
  return response.data;
};

export const deleteFolder = async (id) => {
  const response = await api.delete(`/folders/${id}`);
  return response.data;
};

export const getFolderBookmarks = async (folderId) => {
  const response = await api.get(`/folders/${folderId}/bookmarks`);
  return response.data;
};

export const getFolderRecipes = async (folderId, limit, sort) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (sort) params.append('sort', sort);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/folders/${folderId}/recipes${queryString}`);
  return response.data;
};

export const getFolderSuggestions = async (folderId) => {
  const response = await api.get(`/folders/${folderId}/suggest`);
  return response.data;
};
