"""
SERENE AI — Multimodal Emotion Fusion Engine.

Implements Weighted Late Fusion over canonical emotion distributions:
1. Canonical Emotions: ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise']
2. Modality Mappings:
   - Text (GoEmotions 28 classes) -> Projected and normalized onto Canonical 7.
   - Face (FER-2013 7 classes) -> Direct 1:1 mapping to Canonical 7.
   - Voice (RAVDESS 8 classes) -> 'calm' folded into 'neutral', producing Canonical 7.
3. Dynamic Late Fusion:
   - Base weights: text=0.40, face=0.35, voice=0.25
   - If modalities are missing, active weights are re-normalized to sum to 1.0.
   - Zero fabrication: absent modalities are never hallucinated.
"""

from typing import Dict, List, Optional, Any

CANONICAL_EMOTIONS = [
    "anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"
]

DEFAULT_WEIGHTS = {
    "text": 0.40,
    "face": 0.35,
    "voice": 0.25
}

TEXT_TO_CANONICAL = {
    "anger": ["anger", "annoyance", "disapproval"],
    "disgust": ["disgust"],
    "fear": ["fear", "nervousness"],
    "joy": ["joy", "amusement", "excitement", "gratitude", "love", "optimism", "pride", "relief", "admiration"],
    "neutral": ["neutral", "realization", "curiosity"],
    "sadness": ["sadness", "disappointment", "grief", "remorse", "embarrassment"],
    "surprise": ["surprise"]
}

# Reverse lookup for fast text mapping
INVERSE_TEXT_MAP = {}
for canonical, sub_emotions in TEXT_TO_CANONICAL.items():
    for sub in sub_emotions:
        INVERSE_TEXT_MAP[sub.lower()] = canonical

FACE_TO_CANONICAL = {
    "angry": "anger",
    "disgust": "disgust",
    "fear": "fear",
    "happy": "joy",
    "neutral": "neutral",
    "sad": "sadness",
    "surprise": "surprise"
}

VOICE_TO_CANONICAL = {
    "angry": "anger",
    "disgust": "disgust",
    "fearful": "fear",
    "happy": "joy",
    "neutral": "neutral",
    "calm": "neutral",
    "sad": "sadness",
    "surprised": "surprise"
}

def project_text_distribution(distribution: List[Dict[str, Any]]) -> Dict[str, float]:
    """Projects 28-class GoEmotions predictions into canonical 7-emotion space."""
    vec = {e: 0.0 for e in CANONICAL_EMOTIONS}
    total = 0.0
    for item in distribution:
        raw_label = item.get("label", "").lower().strip()
        score = float(item.get("score", 0.0))
        canonical = INVERSE_TEXT_MAP.get(raw_label)
        if canonical:
            vec[canonical] += score
            total += score
            
    # Normalize to sum to 1.0
    if total > 0.0:
        for e in CANONICAL_EMOTIONS:
            vec[e] /= total
    else:
        vec["neutral"] = 1.0
    return vec

def project_face_distribution(distribution: List[Dict[str, Any]]) -> Dict[str, float]:
    """Projects 7-class FER-2013 predictions into canonical 7-emotion space."""
    vec = {e: 0.0 for e in CANONICAL_EMOTIONS}
    total = 0.0
    for item in distribution:
        raw_label = item.get("label", "").lower().strip()
        score = float(item.get("score", 0.0))
        canonical = FACE_TO_CANONICAL.get(raw_label, raw_label)
        if canonical in vec:
            vec[canonical] += score
            total += score
            
    if total > 0.0:
        for e in CANONICAL_EMOTIONS:
            vec[e] /= total
    else:
        vec["neutral"] = 1.0
    return vec

def project_voice_distribution(distribution: List[Dict[str, Any]]) -> Dict[str, float]:
    """Projects 8-class RAVDESS predictions (calm->neutral) into canonical 7-emotion space."""
    vec = {e: 0.0 for e in CANONICAL_EMOTIONS}
    total = 0.0
    for item in distribution:
        raw_label = item.get("label", "").lower().strip()
        score = float(item.get("score", 0.0))
        canonical = VOICE_TO_CANONICAL.get(raw_label, raw_label)
        if canonical in vec:
            vec[canonical] += score
            total += score
            
    if total > 0.0:
        for e in CANONICAL_EMOTIONS:
            vec[e] /= total
    else:
        vec["neutral"] = 1.0
    return vec

def dynamic_late_fusion(
    text_result: Optional[Dict[str, Any]] = None,
    face_result: Optional[Dict[str, Any]] = None,
    voice_result: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes dynamic late fusion across provided modality outputs.
    Missing modalities are omitted, and weights re-normalized.
    """
    available_vectors = {}
    top_per_modality = {}
    
    if text_result and text_result.get("distribution"):
        available_vectors["text"] = project_text_distribution(text_result["distribution"])
        top_per_modality["text"] = text_result.get("topEmotion")
        
    if face_result and face_result.get("distribution"):
        available_vectors["face"] = project_face_distribution(face_result["distribution"])
        top_per_modality["face"] = face_result.get("topEmotion")
        
    if voice_result and voice_result.get("distribution"):
        available_vectors["voice"] = project_voice_distribution(voice_result["distribution"])
        top_per_modality["voice"] = voice_result.get("topEmotion")
        
    if not available_vectors:
        raise ValueError("No modality predictions available for fusion. At least one modality is required.")
        
    # Re-normalize weights for available modalities
    active_keys = list(available_vectors.keys())
    sum_weights = sum(DEFAULT_WEIGHTS[k] for k in active_keys)
    norm_weights = {k: round(DEFAULT_WEIGHTS[k] / sum_weights, 4) for k in active_keys}
    
    # Compute combined probability distribution
    combined = {e: 0.0 for e in CANONICAL_EMOTIONS}
    for k in active_keys:
        w = norm_weights[k]
        v = available_vectors[k]
        for e in CANONICAL_EMOTIONS:
            combined[e] += w * v[e]
            
    # Sort emotions by fused score
    sorted_distribution = sorted(
        [{"label": e, "score": round(combined[e], 4)} for e in CANONICAL_EMOTIONS],
        key=lambda x: x["score"],
        reverse=True
    )
    
    fused_top = sorted_distribution[0]["label"]
    fused_confidence = sorted_distribution[0]["score"]
    
    # Generate disagreement note if top emotions diverge
    divergences = []
    for k, raw_top in top_per_modality.items():
        if raw_top:
            canon = (
                INVERSE_TEXT_MAP.get(raw_top.lower()) if k == "text"
                else FACE_TO_CANONICAL.get(raw_top.lower(), raw_top.lower()) if k == "face"
                else VOICE_TO_CANONICAL.get(raw_top.lower(), raw_top.lower())
            )
            if canon != fused_top:
                divergences.append(f'{k} indicated "{raw_top}"')
                
    disagreement_note = None
    if divergences:
        disagreement_note = (
            f"Note: {'; '.join(divergences)}. "
            f"The fused result '{fused_top}' reflects the weighted multimodal consensus."
        )
        
    return {
        "model": "serene-ai-multimodal-late-fusion",
        "modelType": "dynamic-weighted-late-fusion",
        "topEmotion": fused_top,
        "confidence": fused_confidence,
        "distribution": sorted_distribution,
        "modalitiesUsed": active_keys,
        "modalitiesWeights": norm_weights,
        "disagreementNote": disagreement_note
    }

