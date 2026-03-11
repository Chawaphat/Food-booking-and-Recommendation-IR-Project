import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

export const searchRecipes = async (query) => {
    const response = await api.post('/search/', { query });
    return response.data;
};

export const getRandomRecipes = async () => {
    const response = await api.get('/recipes/random');
    return response.data;
};

export const getRecipeDetail = async (id) => {
    const response = await api.get(`/search/${id}`);
    return response.data;
};

export const bookmarkRecipe = async (recipeId, rating) => {
    const response = await api.post('/bookmark', { recipe_id: recipeId, rating });
    return response.data;
};

export const getBookmarks = async () => {
    const response = await api.get('/bookmarks');
    return response.data;
};

export default api;
