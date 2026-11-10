# SERENE AI — Multimodal Emotion Datasets & Preprocessing

SERENE AI is an AI-powered multimodal emotional expression platform. This directory (`ml/`) contains the complete dataset pipelines, preprocessing scripts, manifests, and documentation for the three core modalities:
1. **Facial Expression Recognition (Vision)**: FER-2013
2. **Text Emotion Detection (NLP)**: GoEmotions
3. **Speech Emotion Recognition (Audio)**: RAVDESS

---

## 1. Directory Structure

```text
ml/
├── datasets/
│   ├── fer2013/
│   │   ├── train/                 # 28,709 images (7 emotion classes)
│   │   ├── test/                  # 7,178 images (7 emotion classes)
│   │   └── fer2013_manifest.csv   # Unified manifest with stratified splits
│   ├── goemotions/
│   │   ├── emotions.txt           # 28 official emotion classes
│   │   ├── train.tsv              # 43,410 comments
│   │   ├── dev.tsv                # 5,426 comments
│   │   ├── test.tsv               # 5,427 comments
│   │   └── goemotions_manifest.csv# Unified multi-label manifest
│   └── ravdess/
│       ├── Actor_01/ ... Actor_24/# 1,440 WAV files (60 per actor)
│       └── ravdess_manifest.csv   # Actor-disjoint audio manifest
├── scripts/
│   ├── download_fer2013.py        # FER-2013 documentation & verification
│   ├── prepare_fer2013.py         # FER-2013 stratified preprocessing & manifest
│   ├── download_goemotions.py     # GoEmotions Google Research downloader
│   ├── prepare_goemotions.py      # GoEmotions multi-label parser & manifest
│   ├── download_ravdess.py        # Zenodo downloader with MD5 verification
│   └── prepare_ravdess.py         # RAVDESS actor-disjoint audio parser & manifest
└── README.md                      # Comprehensive dataset documentation
```

---

## 2. Dataset Overviews

### Modality A: FER-2013 (Facial Expressions)
- **Source**: ICML 2013 Challenges in Representation Learning / Kaggle Challenge.
- **Image Specifications**: Grayscale, 48 × 48 pixels.
- **Classes (7)**:
  - `0`: `angry`
  - `1`: `disgust`
  - `2`: `fear`
  - `3`: `happy`
  - `4`: `neutral`
  - `5`: `sad`
  - `6`: `surprise`
- **Data Splits & Integrity**:
  - Original Train: 28,709 images
  - Original Test: 7,178 images (preserved 100% untouched for benchmarking)
  - Validation Split: Created by stratified 80/20 partitioning of the original training set.
    - **Train partition**: 22,967 images
    - **Val partition**: 5,742 images
    - **Test partition**: 7,178 images
    - **Total Verified Images**: 35,887 images (0 corrupt files).
- **Manifest**: `ml/datasets/fer2013/fer2013_manifest.csv`

---

### Modality B: GoEmotions (Text)
- **Source**: Google Research ([Demszky et al., ACL 2020](https://arxiv.org/abs/2005.00547)).
- **Curated Benchmark Count**: **54,263** total examples.
  - `train.tsv`: 43,410 rows (80%)
  - `dev.tsv`: 5,426 rows (10%)
  - `test.tsv`: 5,427 rows (10%)
- **Investigation: 58,009 vs. 54,263**:
  - The raw collection contains 58,009 crowd-annotated Reddit comments (`full_dataset/goemotions_1..3.csv`).
  - Google filtered out 3,746 comments (6.45%) where annotators failed to reach consensus (no emotion received at least 2 rater votes).
  - The standard curated benchmark split released by Google Research comprises exactly 54,263 consensus comments.
- **Emotion Classes (28)**:
  `admiration`, `amusement`, `anger`, `annoyance`, `approval`, `caring`, `confusion`, `curiosity`, `desire`, `disappointment`, `disapproval`, `disgust`, `embarrassment`, `excitement`, `fear`, `gratitude`, `grief`, `joy`, `love`, `nervousness`, `optimism`, `pride`, `realization`, `relief`, `remorse`, `sadness`, `surprise`, `neutral`.
- **Multi-label Preservation**:
  - Single-label comments: 45,446
  - Multi-label comments: 8,817 (up to 5 emotions per comment)
  - All annotations preserved with binary indicator columns (`emo_<name>`) in the manifest.
- **Manifest**: `ml/datasets/goemotions/goemotions_manifest.csv`
- **Licence**: Apache License 2.0.

---

### Modality C: RAVDESS (Speech Audio)
- **Source**: Zenodo Record `1188976` ([Livingstone & Russo, PLoS ONE 2018](https://doi.org/10.1371/journal.pone.0196391)).
- **Archive**: `Audio_Speech_Actors_01-24.zip` (~208 MB).
- **MD5 Checksum**: `bc696df654c87fed845eb13823edef8a` (Verified).
- **Audio Specifications**: 16-bit PCM, 48 kHz sampling rate, 2 channels (Stereo).
- **Total Recordings**: 1,440 `.wav` files (60 trials per actor across 24 actors: 12 male, 12 female).
- **Emotions (8)**:
  `neutral` (01), `calm` (02), `happy` (03), `sad` (04), `angry` (05), `fearful` (06), `disgust` (07), `surprised` (08).
- **Actor-Disjoint Partitioning (Zero Speaker Leakage)**:
  To prevent identity leakage and ensure genuine generalization in speech emotion recognition, splits are strictly actor-disjoint with equal gender balance:
  - **Train Split (66.7%)**: Actors `01` to `16` (16 actors: 8 Male, 8 Female = 960 files).
  - **Validation Split (16.7%)**: Actors `17` to `20` (4 actors: 2 Male, 2 Female = 240 files).
  - **Test Split (16.7%)**: Actors `21` to `24` (4 actors: 2 Male, 2 Female = 240 files).
- **Licence & Attribution**:
  - Distributed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** licence.
  - **Attribution Citation**:
    > Livingstone SR, Russo FA (2018) The Ryerson Audio-Visual Database of Emotional Speech and Song (RAVDESS): A dynamic, multimodal set of facial and vocal expressions in North American English. *PLoS ONE* 13(5): e0196391. https://doi.org/10.1371/journal.pone.0196391

---

## 3. How to Reproduce Dataset Preprocessing

From the workspace root, run the respective scripts:

```bash
# 1. Regenerate FER-2013 Manifest & Stratified Splits
python ml/scripts/prepare_fer2013.py

# 2. Regenerate GoEmotions Manifest & Multi-label Indicators
python ml/scripts/prepare_goemotions.py

# 3. Download & Verify RAVDESS (if needed)
python ml/scripts/download_ravdess.py

# 4. Generate RAVDESS Actor-Disjoint Manifest
python ml/scripts/prepare_ravdess.py
```

---

## 4. Model Training Guide (Google Colab / Kaggle GPU)

Training transformers and vision models should be performed on free GPU tiers (NVIDIA Tesla T4 or P100 with 16 GB VRAM) using the prepared notebooks in `ml/notebooks/`.

### Notebook 1: Text Emotion Model (`01_train_text_distilroberta.ipynb`)
- **Target Architecture**: `distilroberta-base` (~82M parameters).
- **Target Dataset**: GoEmotions (54,263 curated examples, 28 multi-label classes).
- **Loss**: `torch.nn.BCEWithLogitsLoss(pos_weight=...)` with square-root positive class weighting.
- **Metrics**: Macro-F1, Micro-F1, Hamming Loss.
- **Runtime**: ~12–15 minutes for 5 epochs on T4 GPU.
- **Colab Execution**:
  1. Upload `01_train_text_distilroberta.ipynb` to Google Colab.
  2. Set Runtime Type to **T4 GPU** (`Runtime -> Change runtime type -> T4 GPU`).
  3. Run all cells sequentially. The notebook auto-downloads the GoEmotions benchmark splits.
  4. Best checkpoint is saved to `checkpoints/text_model/`. Download and place in `ml/checkpoints/text_model/`.

### Notebook 2: Facial Emotion Model (`02_train_face_mobilenet_vs_vit.ipynb`)
- **Architectures Compared**:
  - `MobileNetV3-Large` (~5.4M params, 48x48 input, ~0.44 GFLOPs).
  - `google/vit-base-patch16-224-in21k` (~86M params, 224x224 input, self-attention across 196 patches).
- **Target Dataset**: FER-2013 (35,887 images, 7 classes).
- **Imbalance Handling**: `WeightedRandomSampler` and class-weighted CrossEntropyLoss.
- **Metrics**: Overall Accuracy, Macro-F1, 7x7 normalized Confusion Matrix.
- **Runtime**: ~8 min (MobileNetV3, 15 epochs) | ~20 min (ViT-Base, 10 epochs) on T4 GPU.
- **Colab/Kaggle Execution**:
  1. Upload notebook along with `fer2013_manifest.csv` and image archive.
  2. Run cells to train and compare both architectures.
  3. The notebook automatically identifies the superior model and exports it to `checkpoints/face_model/`.

### Notebook 3: Speech Emotion Model (`03_train_voice_wav2vec2.ipynb`)
- **Target Architecture**: `facebook/wav2vec2-base` (~95M parameters).
- **Target Dataset**: RAVDESS (1,440 WAVs across 24 actors).
- **Split Strategy**: Strictly **Actor-Disjoint** (Train: Actors 01–16, Val: 17–20, Test: 21–24) to prevent speaker leakage.
- **Preprocessing**: 16 kHz Mono resampling, padding/truncating to 3.5 seconds (56,000 samples).
- **Metrics**: Unweighted Average Recall (UAR / balanced accuracy) and Weighted Accuracy (WA).
- **Canonical Mapping**: Evaluates all 8 classes during training, folds `calm` into `neutral` for SERENE AI 7 canonical outputs.
- **Runtime**: ~10–14 minutes for 15 epochs on T4 GPU.
- **Colab/Kaggle Execution**:
  1. Upload notebook along with `ravdess_manifest.csv` and audio files.
  2. Run cells to fine-tune Wav2Vec2 with temporal mean pooling and UAR tracking.
  3. Best checkpoint is exported to `checkpoints/voice_model/`.

---

## 5. Python Inference Microservice (`ml/inference/`)

A production-ready **FastAPI** service (`ml/inference/service.py`) provides unified REST endpoints for frontend and backend integration:

```bash
# Start the inference microservice
cd ml/inference
pip install -r requirements.txt
python service.py
# Server runs on http://localhost:8000
```

### Endpoints
- `GET /health`: Healthcheck endpoint reporting readiness of loaded models (`text`, `face`, `voice`).
- `POST /predict/text`: Accepts JSON `{"text": "..."}`, returns emotion distribution.
- `POST /predict/face`: Accepts image file upload (multipart/form-data), returns facial expression distribution.
- `POST /predict/voice`: Accepts WAV audio upload (multipart/form-data), returns speech emotion distribution.
- `POST /predict/multimodal`: Accepts text, image, and audio in a single request, executing dynamic late fusion server-side.

### Strict Non-Fabrication Guarantee
If model checkpoints are not found in `ml/checkpoints/`, endpoints return **HTTP 503 Service Unavailable** with an explicit notification that model training must be completed first. Under no circumstances are mock scores or fake predictions emitted.

---

## 6. Backend Integration (Zero Breaking Changes)

The existing Node.js Express backend (`backend/services/huggingface.js` and `backend/services/fusion.js`) can seamlessly route to the Python microservice by adding:

```env
# backend/.env
ML_SERVICE_URL=http://localhost:8000
```

All existing authentication, Firestore/MongoDB database records, journal entries, and analytics visualizations remain 100% intact.


