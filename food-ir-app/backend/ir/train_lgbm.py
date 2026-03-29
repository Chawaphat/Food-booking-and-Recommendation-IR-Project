import os
import pickle
import time

import numpy as np
import pandas as pd
import lightgbm as lgb
from scipy.sparse import vstack
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score

_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_ROOT, "data", "processed")
_RAW_DIR  = os.path.join(_ROOT, "data", "raw")

MATRIX_PATH = os.path.join(_DATA_DIR, "tfidf_matrix.pkl")
IDS_PATH    = os.path.join(_DATA_DIR, "recipe_ids.pkl")
META_PATH   = os.path.join(_DATA_DIR, "recipe_meta.csv")
REVIEWS_PATH = os.path.join(_RAW_DIR, "reviews.csv")
MODEL_OUT   = os.path.join(_DATA_DIR, "lightgbm_model.txt")


print("Loading TF-IDF matrix …", end=" ", flush=True)
t0 = time.time()
with open(MATRIX_PATH, "rb") as f:
    tfidf_matrix = pickle.load(f)
with open(IDS_PATH, "rb") as f:
    recipe_ids_raw = pickle.load(f)
recipe_ids  = [str(r) for r in recipe_ids_raw]
id_to_idx   = {rid: i for i, rid in enumerate(recipe_ids)}
print(f"done ({time.time()-t0:.1f}s)  shape={tfidf_matrix.shape}")

meta = pd.read_csv(META_PATH, dtype={"RecipeId": str}).set_index("RecipeId")

def get_meta(rid: str):
    if rid in meta.index:
        row = meta.loc[rid]
        return float(row["avg_rating"]), float(row["review_count"])
    return 0.0, 0.0

print("Loading reviews …", end=" ", flush=True)
reviews = pd.read_csv(
    REVIEWS_PATH,
    usecols=["AuthorId", "RecipeId", "Rating"],
    dtype={"AuthorId": str, "RecipeId": str, "Rating": float},
)
print(f"done  {len(reviews):,} rows")

reviews = reviews[reviews["Rating"] != 3].copy()
reviews["label"] = (reviews["Rating"] >= 4).astype(int)

MAX_PER_CLASS = 30_000
pos = reviews[reviews["label"] == 1].sample(
    n=min(MAX_PER_CLASS, (reviews["label"] == 1).sum()), random_state=42
)
neg = reviews[reviews["label"] == 0].sample(
    n=min(MAX_PER_CLASS, (reviews["label"] == 0).sum()), random_state=42
)
samples = pd.concat([pos, neg]).sample(frac=1, random_state=42).reset_index(drop=True)
print(f"Training samples: {len(samples):,}  (pos={len(pos):,}, neg={len(neg):,})")

print("Building user profiles …", end=" ", flush=True)
liked = reviews[reviews["label"] == 1]
user_profile_map: dict[str, np.ndarray] = {}

for author_id, group in liked.groupby("AuthorId"):
    idxs = [id_to_idx[r] for r in group["RecipeId"] if r in id_to_idx]
    if not idxs:
        continue
    rows = vstack([tfidf_matrix[i] for i in idxs])
    profile = np.asarray(rows.mean(axis=0)).ravel()
    norm = np.linalg.norm(profile)
    if norm > 0:
        user_profile_map[author_id] = profile / norm

print(f"done  {len(user_profile_map):,} user profiles built")

print("Extracting features …", end=" ", flush=True)
X_rows = []
y_vals = []
skipped = 0

for _, row in samples.iterrows():
    rid      = str(row["RecipeId"])
    author   = str(row["AuthorId"])
    label    = int(row["label"])

    idx = id_to_idx.get(rid)
    if idx is None:
        skipped += 1
        continue

    profile = user_profile_map.get(author)
    if profile is not None:
        recipe_vec = np.asarray(tfidf_matrix[idx].todense()).ravel()
        sim = float(np.dot(profile, recipe_vec))
    else:
        sim = 0.0

    avg_r, rev_cnt = get_meta(rid)

    X_rows.append([sim, avg_r, np.log1p(rev_cnt)])
    y_vals.append(label)

X = np.array(X_rows, dtype=np.float32)
y = np.array(y_vals, dtype=np.int32)
print(f"done  X={X.shape}  skipped={skipped}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("Training LightGBM …")
train_data = lgb.Dataset(X_train, label=y_train, feature_name=["sim", "avg_rating", "log_reviews"])
val_data   = lgb.Dataset(X_test,  label=y_test,  reference=train_data)

params = {
    "objective":   "binary",
    "metric":      ["binary_logloss", "auc"],
    "learning_rate": 0.05,
    "num_leaves":  31,
    "min_data_in_leaf": 20,
    "feature_fraction": 1.0,
    "bagging_fraction": 0.8,
    "bagging_freq":     5,
    "verbose":     -1,
    "seed":        42,
}

callbacks = [
    lgb.early_stopping(stopping_rounds=20, verbose=True),
    lgb.log_evaluation(period=20),
]

model = lgb.train(
    params,
    train_data,
    num_boost_round=300,
    valid_sets=[val_data],
    callbacks=callbacks,
)

y_pred_prob = model.predict(X_test)
y_pred      = (y_pred_prob >= 0.5).astype(int)

auc = roc_auc_score(y_test, y_pred_prob)
acc = accuracy_score(y_test, y_pred)
print(f"\n{'─'*40}")
print(f"Test AUC      : {auc:.4f}")
print(f"Test Accuracy : {acc:.4f}")
print(f"{'─'*40}")

importance = model.feature_importance(importance_type="gain")
feat_names  = model.feature_name()
print("\nFeature importance (gain):")
for name, imp in sorted(zip(feat_names, importance), key=lambda x: -x[1]):
    print(f"  {name:20s}: {imp:.2f}")

model.save_model(MODEL_OUT)
print(f"\n✅ Model saved → {MODEL_OUT}")
