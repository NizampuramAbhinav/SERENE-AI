"""
SERENE AI — Python Inference Microservice (FastAPI).

Provides high-performance local/hosted inference endpoints for:
- Text Emotion Detection: DistilRoBERTa on GoEmotions (28 classes -> canonical 7)
- Facial Expression Recognition: MobileNetV3 / Vision Transformer on FER-2013 (7 classes)
- Voice Emotion Recognition: Wav2Vec2 on RAVDESS (8 classes -> canonical 7)
- Dynamic Multimodal Late Fusion: Combines any available subset of modalities

Strict Non-Fabrication Policy:
- Requires real trained checkpoints in `ml/checkpoints/`.
- If checkpoints are absent, returns HTTP 503 explaining that model training must be completed first.
- Strictly NO mock predictions or fabricated scores.
"""

from pathlib import Path
import io
import json
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image

# Import fusion engine
from fusion import dynamic_late_fusion, CANONICAL_EMOTIONS

CHECKPOINTS_DIR = Path(__file__).resolve().parent.parent / "checkpoints"
CONFIGS_DIR = Path(__file__).resolve().parent.parent / "configs"

# Global model state
models_state = {
    "text": {"loaded": False, "model": None, "tokenizer": None, "config": None},
    "face": {"loaded": False, "model": None, "transform": None, "processor": None, "config": None, "type": None},
    "voice": {"loaded": False, "model": None, "processor": None, "config": None}
}

class TextInput(BaseModel):
    text: str

def load_models_if_available():
    """Attempts to load trained checkpoints from ml/checkpoints/ if present."""
    global models_state
    
    # 1. Text Checkpoint (DistilRoBERTa)
    text_ckpt = CHECKPOINTS_DIR / "text_model"
    if text_ckpt.exists() and (text_ckpt / "config.json").exists():
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            tokenizer = AutoTokenizer.from_pretrained(str(text_ckpt))
            model = AutoModelForSequenceClassification.from_pretrained(str(text_ckpt))
            model.eval()
            models_state["text"] = {"loaded": True, "model": model, "tokenizer": tokenizer}
            print(f"[OK] Text model loaded from {text_ckpt}")
        except Exception as e:
            print(f"[WARN] Error loading text model: {e}")

    # 2. Face Checkpoint (MobileNetV3 or ViT)
    face_ckpt = CHECKPOINTS_DIR / "face_model"
    if face_ckpt.exists() and ((face_ckpt / "model.pt").exists() or (face_ckpt / "config.json").exists()):
        try:
            import torch
            if (face_ckpt / "config.json").exists():
                from transformers import AutoImageProcessor, AutoModelForImageClassification
                processor = AutoImageProcessor.from_pretrained(str(face_ckpt))
                model = AutoModelForImageClassification.from_pretrained(str(face_ckpt))
                model.eval()
                models_state["face"] = {"loaded": True, "model": model, "processor": processor, "transform": None, "type": "vit"}
            elif (face_ckpt / "model.pt").exists():
                import torchvision.models as tv_models
                import torchvision.transforms as transforms
                model = tv_models.mobilenet_v3_large(weights=None)
                model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, 7)
                state = torch.load(face_ckpt / "model.pt", map_location="cpu")
                model.load_state_dict(state)
                model.eval()
                transform = transforms.Compose([
                    transforms.Resize((48, 48)),
                    transforms.Grayscale(num_output_channels=3),
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
                models_state["face"] = {"loaded": True, "model": model, "transform": transform, "processor": None, "type": "mobilenet"}
            print(f"[OK] Face model loaded from {face_ckpt}")
        except Exception as e:
            print(f"[WARN] Error loading face model: {e}")

    # 3. Voice Checkpoint (Wav2Vec2)
    voice_ckpt = CHECKPOINTS_DIR / "voice_model"
    if voice_ckpt.exists() and (voice_ckpt / "config.json").exists():
        try:
            from transformers import AutoProcessor, AutoModelForAudioClassification
            processor = AutoProcessor.from_pretrained(str(voice_ckpt))
            model = AutoModelForAudioClassification.from_pretrained(str(voice_ckpt))
            model.eval()
            models_state["voice"] = {"loaded": True, "model": model, "processor": processor}
            print(f"[OK] Voice model loaded from {voice_ckpt}")
        except Exception as e:
            print(f"[WARN] Error loading voice model: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    load_models_if_available()
    yield

app = FastAPI(
    title="SERENE AI Inference Service",
    description="Multimodal Emotion Recognition Microservice for Text, Face, and Voice",
    version="1.0.0",
    lifespan=lifespan
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
    return {
        "status": "healthy",
        "service": "SERENE AI Multimodal Emotion Inference Engine",
        "models_ready": {
            "text": models_state["text"]["loaded"],
            "face": models_state["face"]["loaded"],
            "voice": models_state["voice"]["loaded"]
        },
        "canonical_emotions": CANONICAL_EMOTIONS,
        "note": "Train models via ml/notebooks/ on Google Colab/Kaggle and save checkpoints to ml/checkpoints/ to activate real-time local inference."
    }

@app.post("/predict/text")
def predict_text(payload: TextInput):
    if not models_state["text"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Text emotion model checkpoint not found in ml/checkpoints/text_model. Model training must be executed before running live predictions."
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
        scores = torch.sigmoid(logits).squeeze().cpu().numpy()
        
    labels = model.config.id2label if hasattr(model.config, "id2label") else [f"class_{i}" for i in range(len(scores))]
    distribution = sorted(
        [{"label": labels[i], "score": float(round(scores[i], 4))} for i in range(len(scores))],
        key=lambda x: x["score"],
        reverse=True
    )
    
    return {
        "model": "distilroberta-goemotions",
        "modelType": "fine-tuned-distilroberta-multi-label",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution
    }

@app.post("/predict/face")
async def predict_face(image: UploadFile = File(...)):
    if not models_state["face"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Facial emotion model checkpoint not found in ml/checkpoints/face_model. Model training must be executed before running live predictions."
        )
        
    contents = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")
        
    import torch
    model = models_state["face"]["model"]
    face_type = models_state["face"].get("type", "vit")
    
    with torch.no_grad():
        if face_type == "vit":
            processor = models_state["face"]["processor"]
            inputs = processor(images=pil_img, return_tensors="pt")
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
            labels = model.config.id2label
        else:
            transform = models_state["face"]["transform"]
            tensor = transform(pil_img).unsqueeze(0)
            logits = model(tensor)
            probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
            labels = {0: "angry", 1: "disgust", 2: "fear", 3: "happy", 4: "neutral", 5: "sad", 6: "surprise"}
            
    distribution = sorted(
        [{"label": labels[i], "score": float(round(probs[i], 4))} for i in range(len(probs))],
        key=lambda x: x["score"],
        reverse=True
    )
    
    return {
        "model": "fer2013-emotion-classifier",
        "modelType": f"fine-tuned-{face_type}",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution
    }

@app.post("/predict/voice")
async def predict_voice(audio: UploadFile = File(...)):
    if not models_state["voice"]["loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice emotion model checkpoint not found in ml/checkpoints/voice_model. Model training must be executed before running live predictions."
        )
        
    contents = await audio.read()
    import scipy.io.wavfile as wavfile
    try:
        sr, audio_data = wavfile.read(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid WAV file: {e}")
        
    # Convert stereo to mono if needed
    if len(audio_data.shape) > 1:
        audio_data = audio_data.mean(axis=1)
    audio_data = audio_data.astype(np.float32)
    max_val = np.max(np.abs(audio_data))
    if max_val > 0:
        audio_data /= max_val
        
    import torch
    processor = models_state["voice"]["processor"]
    model = models_state["voice"]["model"]
    
    inputs = processor(audio_data, sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
        labels = model.config.id2label
        
    distribution = sorted(
        [{"label": labels[i], "score": float(round(probs[i], 4))} for i in range(len(probs))],
        key=lambda x: x["score"],
        reverse=True
    )
    
    return {
        "model": "wav2vec2-ravdess-speech-emotion",
        "modelType": "fine-tuned-wav2vec2-base",
        "topEmotion": distribution[0]["label"],
        "confidence": distribution[0]["score"],
        "distribution": distribution
    }

@app.post("/predict/multimodal")
async def predict_multimodal(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    """
    Accepts text, image, and audio concurrently.
    Executes available modality predictions and runs dynamic late fusion.
    """
    text_result = None
    face_result = None
    voice_result = None
    
    if text and text.strip():
        text_result = predict_text(TextInput(text=text))
        
    if image is not None:
        face_result = await predict_face(image)
        
    if audio is not None:
        voice_result = await predict_voice(audio)
        
    if not text_result and not face_result and not voice_result:
        raise HTTPException(status_code=400, detail="Provide at least one input modality (text, image, or audio).")
        
    fused = dynamic_late_fusion(text_result, face_result, voice_result)
    return fused

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
