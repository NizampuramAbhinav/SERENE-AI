"""
RAVDESS Speech Dataset Preparation & Verification Script for SERENE AI.

Features:
- Scans all 24 actor directories deterministically.
- Parses the 7-part RAVDESS identifier system:
    1. Modality (03 = audio-only)
    2. Vocal channel (01 = speech)
    3. Emotion (01=neutral, 02=calm, 03=happy, 04=sad, 05=angry, 06=fearful, 07=disgust, 08=surprised)
    4. Intensity (01 = normal, 02 = strong)
    5. Statement (01 = "Kids...", 02 = "Dogs...")
    6. Repetition (01 = 1st rep, 02 = 2nd rep)
    7. Actor (01 to 24; odd = male, even = female)
- Constructs an Actor-Disjoint Split:
    - Train: Actors 01 to 16 (16 actors: 8 M, 8 F -> 960 files, 66.7%)
    - Val:   Actors 17 to 20 (4 actors: 2 M, 2 F -> 240 files, 16.7%)
    - Test:  Actors 21 to 24 (4 actors: 2 M, 2 F -> 240 files, 16.7%)
    This guarantees 0 speaker leakage and exact gender balance across all partitions.
- Inspects audio properties (sample rate, channels, bit depth, duration) via python's `wave` module.
- Outputs `ravdess_manifest.csv`.
"""

from pathlib import Path
import wave
import pandas as pd

DATASET_ROOT = Path(__file__).resolve().parent.parent / "datasets" / "ravdess"
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_MANIFEST = DATASET_ROOT / "ravdess_manifest.csv"

# Official RAVDESS mappings
EMOTIONS = {
    "01": "neutral",
    "02": "calm",
    "03": "happy",
    "04": "sad",
    "05": "angry",
    "06": "fearful",
    "07": "disgust",
    "08": "surprised"
}

INTENSITIES = {
    "01": "normal",
    "02": "strong"
}

STATEMENTS = {
    "01": "Kids are talking by the door",
    "02": "Dogs are sitting by the door"
}

# Actor-disjoint split mappings (ensures no speaker identity leakage)
TRAIN_ACTORS = {f"{i:02d}" for i in range(1, 17)}    # 01-16 (8 male, 8 female)
VAL_ACTORS   = {f"{i:02d}" for i in range(17, 21)}   # 17-20 (2 male, 2 female)
TEST_ACTORS  = {f"{i:02d}" for i in range(21, 25)}   # 21-24 (2 male, 2 female)

def get_audio_info(file_path):
    with wave.open(str(file_path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        duration = n_frames / float(framerate) if framerate > 0 else 0.0
    return {
        "channels": n_channels,
        "sample_width_bytes": sampwidth,
        "sample_rate": framerate,
        "n_frames": n_frames,
        "duration_seconds": round(duration, 3)
    }

def prepare_ravdess():
    print(f"Scanning RAVDESS speech dataset in: {DATASET_ROOT}")
    
    records = []
    actor_dirs = sorted([d for d in DATASET_ROOT.glob("Actor_*") if d.is_dir()])
    
    if not actor_dirs:
        raise FileNotFoundError(f"No Actor directories found in {DATASET_ROOT}. Did download complete?")
        
    print(f"Found {len(actor_dirs)} actor directories.")
    
    for actor_dir in actor_dirs:
        wav_files = sorted(actor_dir.glob("*.wav"))
        for wav_path in wav_files:
            parts = wav_path.stem.split("-")
            if len(parts) != 7:
                print(f"Skipping unexpected file format: {wav_path.name}")
                continue
                
            modality_code, channel_code, emotion_code, intensity_code, stmt_code, rep_code, actor_code = parts
            
            actor_id = int(actor_code)
            gender = "male" if actor_id % 2 != 0 else "female"
            
            # Determine disjoint split
            if actor_code in TRAIN_ACTORS:
                split = "train"
            elif actor_code in VAL_ACTORS:
                split = "val"
            elif actor_code in TEST_ACTORS:
                split = "test"
            else:
                split = "unknown"
                
            # Read audio specs
            try:
                audio_meta = get_audio_info(wav_path)
            except Exception as e:
                print(f"Error reading audio file {wav_path.name}: {e}")
                audio_meta = {
                    "channels": None,
                    "sample_width_bytes": None,
                    "sample_rate": None,
                    "n_frames": None,
                    "duration_seconds": None
                }
                
            rel_to_dataset = wav_path.relative_to(DATASET_ROOT).as_posix()
            rel_to_workspace = wav_path.relative_to(WORKSPACE_ROOT).as_posix()
            
            records.append({
                "file_name": wav_path.name,
                "relative_path": rel_to_dataset,
                "workspace_path": rel_to_workspace,
                "absolute_path": str(wav_path.resolve()),
                "actor_id": actor_id,
                "actor_code": actor_code,
                "gender": gender,
                "emotion": EMOTIONS.get(emotion_code, "unknown"),
                "emotion_code": emotion_code,
                "emotion_label": int(emotion_code) - 1,  # 0-indexed (0 to 7)
                "intensity": INTENSITIES.get(intensity_code, "unknown"),
                "statement": STATEMENTS.get(stmt_code, "unknown"),
                "repetition": int(rep_code),
                "channels": audio_meta["channels"],
                "sample_rate": audio_meta["sample_rate"],
                "sample_width_bytes": audio_meta["sample_width_bytes"],
                "duration_seconds": audio_meta["duration_seconds"],
                "split": split
            })
            
    df = pd.DataFrame(records)
    print(f"\nTotal audio files parsed: {len(df)}")
    
    # Save manifest
    df.to_csv(OUTPUT_MANIFEST, index=False)
    print(f"Manifest saved to: {OUTPUT_MANIFEST}")
    
    print("\n--- Split Summary (Actor-Disjoint) ---")
    split_summary = df.groupby(["split", "gender"])["actor_id"].nunique().unstack(fill_value=0)
    split_summary["total_actors"] = split_summary.sum(axis=1)
    split_summary["total_files"] = df.groupby("split").size()
    print(split_summary)
    
    print("\n--- Audio Properties Check ---")
    print(f"Unique Sample Rates: {df['sample_rate'].unique()}")
    print(f"Unique Channels: {df['channels'].unique()}")
    print(f"Duration range (seconds): min={df['duration_seconds'].min()}, max={df['duration_seconds'].max()}, mean={df['duration_seconds'].mean():.2f}")
    
    print("\n--- Emotion Distribution per Split ---")
    cross = pd.crosstab(df["emotion"], df["split"])[["train", "val", "test"]]
    print(cross)
    
    return df

if __name__ == "__main__":
    prepare_ravdess()

