"""
FER-2013 Dataset Preparation Script for SERENE AI.

Features:
- Preserves original train and test directories completely untouched.
- Deterministic file ordering via sorted path resolution.
- Relative and absolute paths in manifest.
- Maps emotion strings to integer labels.
- Generates a stratified train/val split (80/20) derived ONLY from the original training set.
- Original test set (7,178 images) is preserved 100% untouched for benchmarking.
"""

from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split

DATASET_ROOT = Path(__file__).resolve().parent.parent / "datasets" / "fer2013"
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_MANIFEST = DATASET_ROOT / "fer2013_manifest.csv"

# Emotion label mapping (0-6)
EMOTION_TO_LABEL = {
    "angry": 0,
    "disgust": 1,
    "fear": 2,
    "happy": 3,
    "neutral": 4,
    "sad": 5,
    "surprise": 6
}

def generate_fer2013_manifest():
    print(f"Scanning FER-2013 dataset in: {DATASET_ROOT}")
    
    records = []
    
    for original_split in ["train", "test"]:
        split_dir = DATASET_ROOT / original_split
        if not split_dir.exists():
            raise FileNotFoundError(f"Missing folder: {split_dir}")
            
        for emotion in sorted(EMOTION_TO_LABEL.keys()):
            class_dir = split_dir / emotion
            if not class_dir.exists():
                raise FileNotFoundError(f"Missing emotion folder: {class_dir}")
                
            # Deterministic, sorted file iteration
            image_files = sorted(class_dir.glob("*"))
            for img in image_files:
                if img.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                    # Relative paths for cross-platform portability
                    rel_to_dataset = img.relative_to(DATASET_ROOT).as_posix()
                    rel_to_workspace = img.relative_to(WORKSPACE_ROOT).as_posix()
                    
                    records.append({
                        "file_name": img.name,
                        "relative_path": rel_to_dataset,
                        "workspace_path": rel_to_workspace,
                        "absolute_path": str(img.resolve()),
                        "emotion": emotion,
                        "label": EMOTION_TO_LABEL[emotion],
                        "original_split": original_split,
                        "split": original_split  # will be updated for train into train/val
                    })

    df = pd.DataFrame(records)
    print(f"Total raw records scanned: {len(df)}")
    print("Breakdown by original_split:")
    print(df.groupby("original_split").size())

    # Create stratified validation split strictly from original_split == 'train'
    train_mask = df["original_split"] == "train"
    train_indices = df[train_mask].index
    
    train_idx, val_idx = train_test_split(
        train_indices,
        test_size=0.20,
        random_state=42,
        stratify=df.loc[train_indices, "label"]
    )
    
    df.loc[val_idx, "split"] = "val"
    
    # Save manifest
    df.to_csv(OUTPUT_MANIFEST, index=False)
    print(f"\nManifest saved to: {OUTPUT_MANIFEST}")
    
    print("\n--- Final Counts by Split ---")
    print(df["split"].value_counts()[["train", "val", "test"]])
    
    print("\n--- Class Distribution per Split ---")
    cross_tab = pd.crosstab(df["emotion"], df["split"])[["train", "val", "test"]]
    print(cross_tab)
    
    return df

if __name__ == "__main__":
    generate_fer2013_manifest()
