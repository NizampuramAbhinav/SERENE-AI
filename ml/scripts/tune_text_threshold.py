import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import precision_score, recall_score, f1_score


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "ml" / "models" / "text" / "trained"
DEV_FILE = PROJECT_ROOT / "ml" / "datasets" / "goemotions" / "dev.tsv"

RESULT_DIR = PROJECT_ROOT / "ml" / "results" / "text"
RESULT_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 8
MAX_LENGTH = 128

THRESHOLDS = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]


def main():
    print("\nSERENE AI - TEXT THRESHOLD TUNING")
    print("=" * 50)

    print("\nLoading GoEmotions development dataset...")

    df = pd.read_csv(
        DEV_FILE,
        sep="\t",
        header=None,
        names=["text", "labels", "comment_id"],
        dtype=str,
        encoding="utf-8",
    )

    df = df.dropna(subset=["text", "labels"]).reset_index(drop=True)

    labels_file = PROJECT_ROOT / "ml" / "datasets" / "goemotions" / "emotions.txt"

    with open(labels_file, "r", encoding="utf-8") as file:
        emotion_labels = [line.strip() for line in file if line.strip()]

    num_labels = len(emotion_labels)

    y_true = np.zeros((len(df), num_labels), dtype=np.int32)

    for i, raw_labels in enumerate(df["labels"]):
        for label in raw_labels.split(","):
            label = label.strip()

            if label:
                label_index = int(label)

                if 0 <= label_index < num_labels:
                    y_true[i, label_index] = 1

    print(f"Development samples: {len(df)}")
    print(f"Emotion classes: {num_labels}")

    print("\nLoading local text model...")

    tokenizer = AutoTokenizer.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )

    model.to("cpu")
    model.eval()

    print("Model loaded successfully.")
    print("\nGenerating predictions...")

    all_scores = []

    for start in range(0, len(df), BATCH_SIZE):
        batch_texts = df["text"].iloc[
            start:start + BATCH_SIZE
        ].tolist()

        inputs = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )

        with torch.no_grad():
            logits = model(**inputs).logits
            scores = torch.sigmoid(logits).cpu().numpy()

        all_scores.append(scores)

        completed = min(start + BATCH_SIZE, len(df))
        print(f"Processed {completed}/{len(df)} samples", end="\r")

    y_scores = np.vstack(all_scores)

    print("\n\nComparing thresholds...")

    results = []

    for threshold in THRESHOLDS:
        y_pred = (y_scores >= threshold).astype(np.int32)

        results.append({
            "threshold": threshold,
            "micro_precision": precision_score(
                y_true, y_pred, average="micro", zero_division=0
            ),
            "micro_recall": recall_score(
                y_true, y_pred, average="micro", zero_division=0
            ),
            "micro_f1": f1_score(
                y_true, y_pred, average="micro", zero_division=0
            ),
            "macro_f1": f1_score(
                y_true, y_pred, average="macro", zero_division=0
            ),
        })

    results_df = pd.DataFrame(results)

    best_index = results_df["micro_f1"].idxmax()
    best_result = results_df.loc[best_index]

    results_df.to_csv(
        RESULT_DIR / "threshold_comparison.csv",
        index=False,
    )

    best_threshold = float(best_result["threshold"])

    with open(
        RESULT_DIR / "best_threshold.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump({
            "selected_threshold": best_threshold,
            "selection_metric": "micro_f1",
            "development_samples": len(df),
            "micro_f1": float(best_result["micro_f1"]),
            "macro_f1": float(best_result["macro_f1"]),
            "micro_precision": float(best_result["micro_precision"]),
            "micro_recall": float(best_result["micro_recall"]),
        }, file, indent=4)

    print("\n" + "=" * 65)
    print("THRESHOLD COMPARISON")
    print("=" * 65)
    print(results_df.to_string(index=False, float_format=lambda x: f"{x:.4f}"))

    print("\nBest threshold based on development micro F1:")
    print(f"Threshold: {best_threshold:.2f}")
    print(f"Micro F1: {best_result['micro_f1']:.4f}")
    print(f"Macro F1: {best_result['macro_f1']:.4f}")

    print("\nResults saved in:")
    print(RESULT_DIR)

    print("\nThreshold tuning completed successfully!")


if __name__ == "__main__":
    main()