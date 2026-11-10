
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from PIL import Image
from torchvision import transforms
from transformers import ViTForImageClassification

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "ml" / "models" / "face" / "trained"
DATASET_DIR = PROJECT_ROOT / "ml" / "datasets" / "fer2013"
MANIFEST_FILE = DATASET_DIR / "fer2013_manifest.csv"

RESULT_DIR = PROJECT_ROOT / "ml" / "results" / "face"
RESULT_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 16

DEVICE = torch.device("cpu")


def main():
    print("\nSERENE AI - FACE MODEL EVALUATION")
    print("=" * 50)

    # Load test manifest
    print("\nLoading FER-2013 test manifest...")

    df = pd.read_csv(MANIFEST_FILE)
    df = df[df["split"] == "test"].reset_index(drop=True)

    if len(df) == 0:
        raise ValueError("No test images found in FER-2013 manifest.")

    # Load model
    print("\nLoading fine-tuned ViT model...")

    model = ViTForImageClassification.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )

    model.to(DEVICE)
    model.eval()

    # Read class labels from model config
    id2label = model.config.id2label
    labels = [
        id2label[i] if i in id2label else id2label[str(i)]
        for i in range(model.config.num_labels)
    ]

    print(f"Emotion classes: {labels}")
    print(f"Test images: {len(df)}")

    # Match deployed inference preprocessing exactly
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.5, 0.5, 0.5],
            std=[0.5, 0.5, 0.5],
        ),
    ])

    all_predictions = []
    all_true_labels = []

    print("\nRunning face predictions...")

    for start in range(0, len(df), BATCH_SIZE):
        batch_df = df.iloc[start:start + BATCH_SIZE]

        images = []
        batch_labels = []

        for _, row in batch_df.iterrows():
            image_path = DATASET_DIR / row["relative_path"]

            if not image_path.is_file():
                raise FileNotFoundError(
                    f"Test image not found: {image_path}"
                )

            image = Image.open(image_path).convert("RGB")
            images.append(transform(image))
            batch_labels.append(int(row["label"]))

        image_batch = torch.stack(images).to(DEVICE)

        with torch.no_grad():
            logits = model(pixel_values=image_batch).logits
            predictions = torch.argmax(logits, dim=-1)

        all_predictions.extend(predictions.cpu().numpy().tolist())
        all_true_labels.extend(batch_labels)

        completed = min(start + BATCH_SIZE, len(df))
        print(f"Processed {completed}/{len(df)} images", end="\r")

    y_true = np.array(all_true_labels)
    y_pred = np.array(all_predictions)

    # Calculate metrics
    print("\n\nCalculating evaluation metrics...")

    accuracy = accuracy_score(y_true, y_pred)

    metrics = {
        "test_images": int(len(y_true)),
        "emotion_classes": len(labels),
        "accuracy": float(accuracy),
        "precision_macro": float(
            precision_score(
                y_true, y_pred, average="macro", zero_division=0
            )
        ),
        "recall_macro": float(
            recall_score(
                y_true, y_pred, average="macro", zero_division=0
            )
        ),
        "f1_macro": float(
            f1_score(
                y_true, y_pred, average="macro", zero_division=0
            )
        ),
        "precision_weighted": float(
            precision_score(
                y_true, y_pred, average="weighted", zero_division=0
            )
        ),
        "recall_weighted": float(
            recall_score(
                y_true, y_pred, average="weighted", zero_division=0
            )
        ),
        "f1_weighted": float(
            f1_score(
                y_true, y_pred, average="weighted", zero_division=0
            )
        ),
    }

    # Per-class report
    report = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
        target_names=labels,
        output_dict=True,
        zero_division=0,
    )

    per_class = []

    for label in labels:
        per_class.append({
            "emotion": label,
            "precision": report[label]["precision"],
            "recall": report[label]["recall"],
            "f1_score": report[label]["f1-score"],
            "support": int(report[label]["support"]),
        })

    per_class_df = pd.DataFrame(per_class)

    # Confusion matrix
    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
    )

    # Save results
    with open(
        RESULT_DIR / "evaluation_metrics.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(metrics, file, indent=4)

    per_class_df.to_csv(
        RESULT_DIR / "per_emotion_metrics.csv",
        index=False,
    )

    pd.DataFrame(
        cm,
        index=labels,
        columns=labels,
    ).to_csv(RESULT_DIR / "confusion_matrix.csv")

    with open(
        RESULT_DIR / "classification_report.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(report, file, indent=4)

    # Display results
    print("\n" + "=" * 50)
    print("FACE MODEL EVALUATION RESULTS")
    print("=" * 50)

    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric}: {value:.4f}")
        else:
            print(f"{metric}: {value}")

    print("\nPer-emotion results:")
    print(
        per_class_df.to_string(
            index=False,
            float_format=lambda x: f"{x:.4f}",
        )
    )

    print("\nConfusion Matrix:")
    print(pd.DataFrame(cm, index=labels, columns=labels))

    print("\nResults saved in:")
    print(RESULT_DIR)

    print("\nFace model evaluation completed successfully!")


if __name__ == "__main__":
    main()
