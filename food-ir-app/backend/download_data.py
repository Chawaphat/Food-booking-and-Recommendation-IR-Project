import os
import gdown

def download_large_files():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    processed_dir = os.path.join(base_dir, "data", "processed")
    os.makedirs(processed_dir, exist_ok=True)

    target_path = os.path.join(processed_dir, "tfidf_matrix.pkl")
    # File ID from Google Drive
    file_id = "1zrPJmB2_8qwz-UjQ1hgjlBCB8DGNDiHi"

    if os.path.exists(target_path):
        print(f"[SKIP] tfidf_matrix.pkl already exists at {target_path}")
    else:
        print("📥 Downloading tfidf_matrix.pkl (351MB) from Google Drive...")
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, target_path, quiet=False)
        print(f"✅ Download complete: {target_path}")

if __name__ == "__main__":
    download_large_files()
