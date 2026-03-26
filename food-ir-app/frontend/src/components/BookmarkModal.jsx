import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import {
  getFolders,
  createFolder,
  bookmarkRecipe,
  updateBookmark,
} from "../services/api";

export default function BookmarkModal({ recipe, onClose, onRefresh }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(
    recipe.folder_id ? recipe.folder_id.toString() : "",
  );
  const [rating, setRating] = useState(recipe.rating || 0);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!recipe.bookmark_id;

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const data = await getFolders();
      setFolders(data);
      if (data.length > 0 && !selectedFolderId) {
        setSelectedFolderId(data[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch folders", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setLoading(true);
      const data = await createFolder(newFolderName);
      setFolders([...folders, data]);
      setSelectedFolderId(data.id.toString());
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (error) {
      console.error("Failed to create folder", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFolderId || rating === 0) {
      alert("Please select a folder and rating");
      return;
    }

    try {
      setLoading(true);
      // We pass the unique recipe identifier. Depending on what `recipe` is, it could be `recipe.id` or `recipe.recipe_id`.
      // Let's assume `recipe.id`
      const recipeId = recipe.id || recipe.recipe_id;
      if (!recipeId) {
        alert("Recipe ID is missing!");
        return;
      }
      if (isEditing) {
        await updateBookmark(
          recipe.bookmark_id,
          rating,
          parseInt(selectedFolderId),
        );
        alert("Bookmark updated successfully!");
      } else {
        await bookmarkRecipe(recipeId, parseInt(selectedFolderId), rating);
        alert("Bookmark added successfully!");
      }
      onClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to save bookmark", error);
      alert("Failed to save bookmark");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Bookmark" : "Bookmark Recipe"}
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Folder
          </label>
          <div className="flex gap-2">
            {!isCreatingFolder ? (
              <>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none"
                >
                  <option value="" disabled>
                    Select a folder
                  </option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                >
                  + New
                </button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder Name"
                  className="w-full px-4 py-2 bg-gray-50 border-transparent rounded-xl outline-none"
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    rating >= star
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selectedFolderId || rating === 0}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition disabled:bg-red-300"
        >
          {loading ? "Saving..." : "Save Bookmark"}
        </button>
      </div>
    </div>
  );
}
