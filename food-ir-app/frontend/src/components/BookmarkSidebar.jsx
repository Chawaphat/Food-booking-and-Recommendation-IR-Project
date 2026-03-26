import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder as FolderIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
} from "lucide-react";

export default function BookmarkSidebar({
  folders,
  folderPreviews,
  onCreateFolder,
}) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30
          flex flex-col bg-white border-r border-gray-100 shadow-soft
          transition-all duration-300 ease-in-out
          ${open ? "w-72" : "w-14"}
        `}
      >
        {/* Toggle button */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-md transition-all z-40"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 pt-6 pb-4 border-b border-gray-100 ${open ? "" : "justify-center"}`}
        >
          <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-red-50 flex items-center justify-center">
            <FolderIcon className="w-4 h-4 text-red-500" />
          </div>
          {open && (
            <span className="font-bold text-gray-900 truncate">
              My Bookmarks
            </span>
          )}
        </div>

        {/* Scrollable folder list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {open ? (
            /* Expanded: show folder cards */
            folderPreviews.length > 0 ? (
              <div className="px-3 space-y-2">
                {folderPreviews.map(({ folder, recipes }) => {
                  const images = (Array.isArray(recipes) ? recipes : []).slice(
                    0,
                    4,
                  );
                  const fallbackSrc =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400";
                  return (
                    <div
                      key={folder.id}
                      onClick={() =>
                        navigate(`/bookmarks/folder/${folder.id}`)
                      }
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all duration-200"
                    >
                      {/* Image mosaic */}
                      {images.length > 0 && (
                        <div
                          className={`grid h-20 gap-0.5 ${images.length >= 4 ? "grid-cols-2 grid-rows-2" : images.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}
                        >
                          {images
                            .slice(0, images.length >= 4 ? 4 : images.length)
                            .map((r, idx) => (
                              <img
                                key={idx}
                                src={r.image || r.image_url || fallbackSrc}
                                alt={r.name}
                                className="w-full h-full object-cover"
                              />
                            ))}
                        </div>
                      )}
                      <div className="px-3 py-2 flex items-center gap-2">
                        <FolderIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {folder.name}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {images.length}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Folders with no recipes */}
                {folders
                  .filter(
                    (f) =>
                      !folderPreviews.some((fp) => fp.folder.id === f.id),
                  )
                  .map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() =>
                        navigate(`/bookmarks/folder/${folder.id}`)
                      }
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all duration-200 px-3 py-3 flex items-center gap-2"
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {folder.name}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">0</span>
                    </div>
                  ))}

                {folders.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No folders yet
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                No folders yet
              </div>
            )
          ) : (
            /* Collapsed: show folder icon pills */
            <div className="flex flex-col items-center gap-3 py-3">
              {folders.slice(0, 6).map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => navigate(`/bookmarks/folder/${folder.id}`)}
                  className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                  title={folder.name}
                >
                  <FolderIcon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className={`border-t border-gray-100 p-3 flex flex-col gap-2 ${open ? "" : "items-center"}`}
        >
          {open ? (
            <>
              <button
                onClick={() => navigate("/bookmarks")}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                View All Bookmarks
              </button>
              <button
                onClick={onCreateFolder}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                Create Folder
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/bookmarks")}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                title="View All Bookmarks"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={onCreateFolder}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                title="Create Folder"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Spacer so main content shifts right */}
      <div
        className={`flex-shrink-0 transition-all duration-300 ease-in-out ${open ? "w-72" : "w-14"}`}
      />
    </>
  );
}
