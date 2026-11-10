"""
GoEmotions Dataset Preparation Script for SERENE AI.

Context & Count Verification:
- Raw Uncurated Comments: 58,009 (full crowd-sourced comments across Reddit).
- Curated Benchmark Split: 54,263 comments (~93.5% of total dataset).
  Comments without rater agreement (fewer than 2 raters agreeing on any label) were pruned
  in the official Google Research benchmark release (Demszky et al., ACL 2020).
- Curated Splits:
    train.tsv: 43,410 rows
    dev.tsv:   5,426 rows
    test.tsv:  5,427 rows
    Total:     54,263 rows

Multi-label Support:
- Preserves all 28 fine-grained emotion categories.
- Multi-label annotations are preserved (never collapsed into single labels).
- Generates 28 one-hot / multi-hot binary indicator columns for loss computation.
"""

from pathlib import Path
import pandas as pd

DATASET_ROOT = Path(__file__).resolve().parent.parent / "datasets" / "goemotions"
EMOTIONS_FILE = DATASET_ROOT / "emotions.txt"
OUTPUT_MANIFEST = DATASET_ROOT / "goemotions_manifest.csv"

def load_emotions():
    if not EMOTIONS_FILE.exists():
        raise FileNotFoundError(f"Missing emotions mapping file: {EMOTIONS_FILE}")
    with open(EMOTIONS_FILE, "r", encoding="utf-8") as f:
        emotions = [line.strip() for line in f if line.strip()]
    return emotions

def prepare_goemotions():
    emotions = load_emotions()
    print(f"Loaded {len(emotions)} emotion classes from emotions.txt:")
    for idx, name in enumerate(emotions):
        print(f"  [{idx:2d}] {name}")
        
    all_dfs = []
    
    for split_name in ["train", "dev", "test"]:
        split_file = DATASET_ROOT / f"{split_name}.tsv"
        if not split_file.exists():
            raise FileNotFoundError(f"Missing split file: {split_file}")
            
        df = pd.read_csv(
            split_file,
            sep="\t",
            header=None,
            names=["text", "raw_labels", "comment_id"],
            dtype={"text": str, "raw_labels": str, "comment_id": str}
        )
        
        df["split"] = split_name
        
        # Parse multi-label indices and emotion names
        def parse_row_labels(lbl_str):
            if pd.isna(lbl_str) or not str(lbl_str).strip():
                return [], []
            indices = [int(x.strip()) for x in str(lbl_str).split(",") if x.strip()]
            names = [emotions[i] for i in indices]
            return indices, names
            
        parsed = df["raw_labels"].apply(parse_row_labels)
        df["label_indices"] = parsed.apply(lambda x: ",".join(map(str, x[0])))
        df["emotion_names"] = parsed.apply(lambda x: ",".join(x[1]))
        df["num_emotions"] = parsed.apply(lambda x: len(x[0]))
        
        # Binary indicator columns for multi-label modeling (0 or 1 for each of the 28 emotions)
        for i, emo in enumerate(emotions):
            col_name = f"emo_{emo}"
            df[col_name] = parsed.apply(lambda x, target=i: 1 if target in x[0] else 0)
            
        print(f"\n{split_name.upper()} split loaded: {len(df)} rows")
        print(f"  Single-label: {(df['num_emotions'] == 1).sum()}")
        print(f"  Multi-label:  {(df['num_emotions'] > 1).sum()}")
        print(f"  Max labels on single text: {df['num_emotions'].max()}")
        
        all_dfs.append(df)
        
    combined_df = pd.concat(all_dfs, ignore_index=True)
    combined_df.to_csv(OUTPUT_MANIFEST, index=False)
    
    print("\n==========================================")
    print("GoEmotions Manifest Generated Successfully!")
    print(f"Manifest Path: {OUTPUT_MANIFEST}")
    print(f"Total Combined Rows: {len(combined_df)}")
    print("Breakdown by Split:")
    print(combined_df["split"].value_counts())
    print("\nOverall Multi-label distribution:")
    print(combined_df["num_emotions"].value_counts().sort_index())
    print("==========================================")
    
    return combined_df

if __name__ == "__main__":
    prepare_goemotions()

