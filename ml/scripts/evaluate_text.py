import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    multilabel_confusion_matrix,
)


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "ml" / "models" / "text" / "trained"
TEST_FILE = PROJECT_ROOT / "ml" / "datasets" / "goemotions" / "test.tsv"

RESULT_DIR = PROJECT_ROOT / "ml" / "results" / "text"
RESULT_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 8
MAX_LENGTH = 128
THRESHOLD = 0.60


def main():
    print("\nSERENE AI - TEXT MODEL EVALUATION")
    print("=" * 50)

    # Load dataset
    print("\nLoading GoEmotions test dataset...")

    df = pd.read_csv(
        TEST_FILE,
        sep="\t",
        header=None,
        names=["text", "labels", "comment_id"],
        dtype=str,
        encoding="utf-8",
    )

    df = df.dropna(subset=["text", "labels"]).reset_index(drop=True)

    # Load emotion labels
    labels_file = PROJECT_ROOT / "ml" / "datasets" / "goemotions" / "emotions.txt"

    with open(labels_file, "r", encoding="utf-8") as file:
        emotion_labels = [line.strip() for line in file if line.strip()]

    num_labels = len(emotion_labels)

    print(f"Test samples: {len(df)}")
    print(f"Emotion classes: {num_labels}")

    # Convert labels into multi-hot vectors
    y_true = np.zeros((len(df), num_labels), dtype=np.int32)

    for i, raw_labels in enumerate(df["labels"]):
        for label in raw_labels.split(","):
            label = label.strip()

            if label:
                label_index = int(label)

                if 0 <= label_index < num_labels:
                    y_true[i, label_index] = 1

    # Load locally trained model
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

    # Run predictions
    all_scores = []

    print("\nRunning predictions...")

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

        print(
            f"Processed {completed}/{len(df)} samples",
            end="\r",
        )

    y_scores = np.vstack(all_scores)
    y_pred = (y_scores >= THRESHOLD).astype(np.int32)

    # Calculate evaluation metrics
    print("\n\nCalculating evaluation metrics...")

    metrics = {
        "test_samples": int(len(df)),
        "emotion_classes": int(num_labels),
        "threshold": THRESHOLD,
        "micro_precision": float(
            precision_score(y_true, y_pred, average="micro", zero_division=0)
        ),
        "micro_recall": float(
            recall_score(y_true, y_pred, average="micro", zero_division=0)
        ),
        "micro_f1": float(
            f1_score(y_true, y_pred, average="micro", zero_division=0)
        ),
        "macro_precision": float(
            precision_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "macro_recall": float(
            recall_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "macro_f1": float(
            f1_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "weighted_f1": float(
            f1_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "exact_match_accuracy": float(
            accuracy_score(y_true, y_pred)
        ),
    }

    # Per-emotion metrics
    per_emotion = []

    for i, emotion in enumerate(emotion_labels):
        per_emotion.append({
            "emotion": emotion,
            "precision": precision_score(
                y_true[:, i], y_pred[:, i], zero_division=0
            ),
            "recall": recall_score(
                y_true[:, i], y_pred[:, i], zero_division=0
            ),
            "f1_score": f1_score(
                y_true[:, i], y_pred[:, i], zero_division=0
            ),
            "support": int(y_true[:, i].sum()),
        })

    per_emotion_df = pd.DataFrame(per_emotion)

    # Per-emotion confusion matrices
    confusion_matrices = multilabel_confusion_matrix(
        y_true,
        y_pred,
    )

    confusion_data = {}

    for i, emotion in enumerate(emotion_labels):
        confusion_data[emotion] = confusion_matrices[i].tolist()

    # Save results
    with open(
        RESULT_DIR / "evaluation_metrics.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(metrics, file, indent=4)

    per_emotion_df.to_csv(
        RESULT_DIR / "per_emotion_metrics.csv",
        index=False,
    )

    with open(
        RESULT_DIR / "confusion_matrices.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(confusion_data, file, indent=4)

    # Display results
    print("\n" + "=" * 50)
    print("TEXT MODEL EVALUATION RESULTS")
    print("=" * 50)

    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric}: {value:.4f}")
        else:
            print(f"{metric}: {value}")

    print("\nResults saved in:")
    print(RESULT_DIR)

    print("\nEvaluation completed successfully!")


if __name__ == "__main__":
    main()