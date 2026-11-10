"""SERENE AI — local multimodal emotion-inference service (FastAPI).

Loads the locally trained models from:
    ml/models/text/trained
    ml/models/face/trained
    ml/models/voice/trained

No Hugging Face hosted inference API is used. Model files must already exist
locally. A modality remains unavailable if its model cannot be loaded.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
import io

import numpy as np
import soundfile as sf
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fusion import dynamic_late_fusion, CANONICAL_EMOTIONS


# service.py is in ml/inference/, so the model folders are under ml/models/.
ML_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = ML_DIR / "models"
TEXT_MODEL_DIR = MODELS_DIR / "text" / "trained"
FACE_MODEL_DIR = MODELS_DIR / "face" / "trained"
VOICE_MODEL_DIR = MODELS_DIR / "voice" / "trained"

TARGET_SAMPLE_RATE = 16_000
MAX_AUDIO_SAMPLES = 56_000  # 3.5 seconds at 16 kHz, matching voice training.


models_state = {
    "text": {"loaded": False, "model": None, "tokenizer": None, "config": None},
    "face": {
        "loaded": False,
        "model": None,
        "transform": None,
        "processor": None,
        "config": None,
        "type": None,
    },
    "voice": {"loaded": False, "model": None, "processor": None, "config": None},
}


class TextInput(BaseModel):
    text: str


def _label_for(config, index: int) -> str:
    """Read a class label safely from a Transformers config."""
    id2label = getattr(config, "id2label", {}) or {}
    return str(id2label.get(index, id2label.get(str(index), f"class_{index}")))


def load_models_if_available():
    """Load each locally trained model independently; one failure won't block others."""
    import torch
    from torchvision import transforms
    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        AutoModelForAudioClassification,
        ViTForImageClassification,
    )

    # 1. Text emotion model: fine-tuned DistilRoBERTa / GoEmotions.
    try:
        if (TEXT_MODEL_DIR / "config.json").is_file():
            print(f"Loading text model from: {TEXT_MODEL_DIR}")
            tokenizer = AutoTokenizer.from_pretrained(
                str(TEXT_MODEL_DIR), local_files_only=True
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                str(TEXT_MODEL_DIR), local_files_only=True
            )
            model.to("cpu")
            model.eval()
            models_state["text"].update(
                loaded=True, model=model, tokenizer=tokenizer, config=model.config
            )
            print("[OK] Text emotion model loaded.")
        else:
            print(f"[WARN] Text model config not found: {TEXT_MODEL_DIR}")
    except Exception as exc:
        print(f"[WARN] Text model loading failed: {exc}")

    # 2. Facial expression model: ViT trained with 224x224 RGB images
    # and normalization mean/std of 0.5, matching the training notebook.
    try:
        if (FACE_MODEL_DIR / "config.json").is_file():
            print(f"Loading face model from: {FACE_MODEL_DIR}")
            model = ViTForImageClassification.from_pretrained(
                str(FACE_MODEL_DIR), local_files_only=True
            )
            model.to("cpu")
            model.eval()

            face_transform = transforms.Compose(
                [
                    transforms.Resize((224, 224)),
                    transforms.ToTensor(),
                    transforms.Normalize(
                        mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]
                    ),
                ]
            )
            models_state["face"].update(
                loaded=True,
                model=model,
                transform=face_transform,
                processor=None,
                config=model.config,
                type="vit",
            )
            print("[OK] Facial expression model loaded.")
        else:
            print(f"[WARN] Face model config not found: {FACE_MODEL_DIR}")
    except Exception as exc:
        print(f"[WARN] Face model loading failed: {exc}")

    # 3. Voice emotion model: fine-tuned Wav2Vec2 audio classifier.
    try:
        if (VOICE_MODEL_DIR / "config.json").is_file():
            print(f"Loading voice model from: {VOICE_MODEL_DIR}")
            model = AutoModelForAudioClassification.from_pretrained(
                str(VOICE_MODEL_DIR), local_files_only=True
            )
            model.to("cpu")
            model.eval()
            models_state["voice"].update(
                loaded=True, model=model, processor=None, config=model.config
            )
            print("[OK] Voice emotion model loaded.")
        else:
            print(f"[WARN] Voice model config not found: {VOICE_MODEL_DIR}")
    except Exception as exc:
        print(f"[WARN] Voice model loading failed: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Do not create old checkpoint folders: the trained models are loaded
    # directly from ml/models/<modality>/trained.
    load_models_if_available()
    yield


app = FastAPI(
    title="SERENE AI Inference Service",
    description="Local multimodal emotion recognition for text, face, and voice",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck():
    ready = {name: state["loaded"] for name, state in models_state.items()}
    return {
        "status": "healthy",
        "service": "SERENE AI Multimodal Emotion Inference Engine",
        "models_ready": ready,
        "canonical_emotions": CANONICAL_EMOTIONS,
        "model_directories": {
            "text": str(TEXT_MODEL_DIR),
            "face": str(FACE_MODEL_DIR),
            "voice": str(VOICE_MODEL_DIR),
        },
        "note": "Models are loaded locally from ml/models/<modality>/trained. A false readiness value means that model did not load.",
    }


@app.post("/predict/text")
def predict_text(payload: TextInput):
    if not models_state["text"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Text model is not loaded. Check ml/models/text/trained and the service startup logs.",
        )

    text = payload.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    import torch

    tokenizer = models_state["text"]["tokenizer"]
    model = models_state["text"]["model"]
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)

    with torch.no_grad():
        logits = model(**inputs).logits
        # GoEmotions was trained as multi-label classification: use sigmoid,
        # not softmax. These scores should not be interpreted as calibrated probabilities.
        scores = torch.sigmoid(logits)[0].cpu().numpy()

    distribution = sorted(
        [
            {"label": _label_for(model.config, i), "score": round(float(score), 4)}
            for i, score in enumerate(scores)
        ],
        key=lambda item: item["score"],
        reverse=True,
    )

    return {
        "model": "distilroberta-goemotions",
        "modelType": "fine-tuned-distilroberta-multi-label",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution,
    }


@app.post("/predict/face")
async def predict_face(image: UploadFile = File(...)):
    if not models_state["face"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face model is not loaded. Check ml/models/face/trained and the service startup logs.",
        )

    contents = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")

    import torch

    model = models_state["face"]["model"]
    transform = models_state["face"]["transform"]
    image_tensor = transform(pil_image).unsqueeze(0)

    with torch.no_grad():
        logits = model(pixel_values=image_tensor).logits
        probabilities = torch.softmax(logits, dim=-1)[0].cpu().numpy()

    distribution = sorted(
        [
            {"label": _label_for(model.config, i), "score": round(float(score), 4)}
            for i, score in enumerate(probabilities)
        ],
        key=lambda item: item["score"],
        reverse=True,
    )

    return {
        "model": "fer2013-emotion-classifier",
        "modelType": "fine-tuned-vit",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution,
    }


@app.post("/predict/voice")
async def predict_voice(audio: UploadFile = File(...)):
    if not models_state["voice"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice model is not loaded. Check ml/models/voice/trained and the service startup logs.",
        )

    contents = await audio.read()
    try:
        # soundfile returns float32 audio; always_2d gives (samples, channels).
        audio_data, sample_rate = sf.read(
            io.BytesIO(contents), dtype="float32", always_2d=True
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid audio file: {exc}")

    if audio_data.size == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    # Match training: convert to mono, resample to 16 kHz, then pad/truncate
    # to 56,000 samples (3.5 seconds). No peak normalization is added.
    mono_audio = audio_data.mean(axis=1)

    import torch
    import torchaudio

    waveform = torch.from_numpy(mono_audio).float()
    if sample_rate != TARGET_SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=TARGET_SAMPLE_RATE
        )
        waveform = resampler(waveform)

    if waveform.numel() > MAX_AUDIO_SAMPLES:
        waveform = waveform[:MAX_AUDIO_SAMPLES]
    elif waveform.numel() < MAX_AUDIO_SAMPLES:
        waveform = torch.nn.functional.pad(
            waveform, (0, MAX_AUDIO_SAMPLES - waveform.numel())
        )

    model = models_state["voice"]["model"]
    input_values = waveform.unsqueeze(0)

    with torch.no_grad():
        logits = model(input_values=input_values).logits
        probabilities = torch.softmax(logits, dim=-1)[0].cpu().numpy()

    distribution = sorted(
        [
            {"label": _label_for(model.config, i), "score": round(float(score), 4)}
            for i, score in enumerate(probabilities)
        ],
        key=lambda item: item["score"],
        reverse=True,
    )

    return {
        "model": "wav2vec2-ravdess-speech-emotion",
        "modelType": "fine-tuned-wav2vec2-base",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution,
    }


@app.post("/predict/multimodal")
async def predict_multimodal(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
):
    """Run whichever input modalities were supplied, then perform late fusion."""
    text_result = None
    face_result = None
    voice_result = None

    if text and text.strip():
        text_result = predict_text(TextInput(text=text))

    if image is not None:
        face_result = await predict_face(image)

    if audio is not None:
        voice_result = await predict_voice(audio)

    if text_result is None and face_result is None and voice_result is None:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one input modality (text, image, or audio).",
        )

    return dynamic_late_fusion(text_result, face_result, voice_result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
