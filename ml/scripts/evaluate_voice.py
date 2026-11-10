
import json
from pathlib import Path

import numpy as np
import pandas as pd
import soundfile as sf
import torch
import torchaudio

from transformers import AutoModelForAudioClassification

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "ml" / "models" / "voice" / "trained"
DATASET_DIR = PROJECT_ROOT / "ml" / "datasets" / "ravdess"
MANIFEST_FILE = DATASET_DIR / "ravdess_manifest.csv"

RESULT_DIR = PROJECT_ROOT / "ml" / "results" / "voice"
RESULT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SAMPLE_RATE = 16000
MAX_AUDIO_SAMPLES = 56000
BATCH_SIZE = 8

DEVICE = torch.device("cpu")


def load_and_preprocess_audio(audio_path, resampler_cache):
    # Load audio as float32, preserving channels.
    audio_data, sample_rate = sf.read(
        audio_path,
        dtype="float32",
        always_2d=True,
    )

    if audio_data.size == 0:
        raise ValueError(f"Empty audio file: {audio_path}")

    # Convert stereo or multichannel audio to mono.
    mono_audio = audio_data.mean(axis=1)

    waveform = torch.from_numpy(mono_audio).float()

    # Resample to 16 kHz, matching deployed inference.
    if sample_rate != TARGET_SAMPLE_RATE:
        if sample_rate not in resampler_cache:
            resampler_cache[sample_rate] = (
                torchaudio.transforms.Resample(
                    orig_freq=sample_rate,
                    new_freq=TARGET_SAMPLE_RATE,
                )
            )

        waveform = resampler_cache[sample_rate](waveform)

    # Match deployed inference: truncate or zero-pad to 56,000 samples.
    if waveform.numel() > MAX_AUDIO_SAMPLES:
        waveform = waveform[:MAX_AUDIO_SAMPLES]
    elif waveform.numel() < MAX_AUDIO_SAMPLES:
        waveform = torch.nn.functional.pad(
            waveform,
            (0, MAX_AUDIO_SAMPLES - waveform.numel()),
        )

    return waveform


def main():
    print("\nSERENE AI - VOICE MODEL EVALUATION")
    print("=" * 50)

    # Load RAVDESS test manifest.
    print("\nLoading RAVDESS test manifest...")

    df = pd.read_csv(MANIFEST_FILE)
    df = df[df["split"] == "test"].reset_index(drop=True)

    if len(df) == 0:
        raise ValueError("No test audio files found in RAVDESS manifest.")

    # Load local fine-tuned model.
    print("\nLoading fine-tuned Wav2Vec2 model...")

    model = AutoModelForAudioClassification.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )

    model.to(DEVICE)
    model.eval()

    # Read emotion labels from model configuration.
    id2label = model.config.id2label

    labels = [
        id2label[i] if i in id2label else id2label[str(i)]
        for i in range(model.config.num_labels)
    ]

    print(f"Emotion classes: {labels}")
    print(f"Test audio samples: {len(df)}")

    all_predictions = []
    all_true_labels = []

    resampler_cache = {}

    print("\nRunning voice predictions...")

    for start in range(0, len(df), BATCH_SIZE):
        batch_df = df.iloc[start:start + BATCH_SIZE]

        waveforms = []
        batch_labels = []

        for _, row in batch_df.iterrows():
            audio_path = DATASET_DIR / row["relative_path"]

            if not audio_path.is_file():
                raise FileNotFoundError(
                    f"Test audio file not found: {audio_path}"
                )

            waveform = load_and_preprocess_audio(
                audio_path,
                resampler_cache,
            )

            waveforms.append(waveform)
            batch_labels.append(int(row["emotion_label"]))

        input_values = torch.stack(waveforms).to(DEVICE)

        with torch.no_grad():
            logits = model(input_values=input_values).logits
            predictions = torch.argmax(logits, dim=-1)

        all_predictions.extend(
            predictions.cpu().numpy().tolist()
        )

        all_true_labels.extend(batch_labels)

        completed = min(start + BATCH_SIZE, len(df))
        print(
            f"Processed {completed}/{len(df)} audio samples",
            end="\r",
        )

    y_true = np.array(all_true_labels)
    y_pred = np.array(all_predictions)

    # Calculate evaluation metrics.
    print("\n\nCalculating evaluation metrics...")

    metrics = {
        "test_samples": int(len(y_true)),
        "emotion_classes": len(labels),
        "accuracy": float(
            accuracy_score(y_true, y_pred)
        ),
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

    # Per-emotion classification report.
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

    # Confusion matrix.
    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
    )

    # Save evaluation results.
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
    ).to_csv(
        RESULT_DIR / "confusion_matrix.csv"
    )

    with open(
        RESULT_DIR / "classification_report.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(report, file, indent=4)

    # Display results.
    print("\n" + "=" * 50)
    print("VOICE MODEL EVALUATION RESULTS")
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
    print(
        pd.DataFrame(
            cm,
            index=labels,
            columns=labels,
        )
    )

    print("\nResults saved in:")
    print(RESULT_DIR)

    print("\nVoice model evaluation completed successfully!")


if __name__ == "__main__":
    main()
