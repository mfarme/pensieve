#!/usr/bin/env python3
"""
Whisper GPU Transcription Script for Pensieve
Uses PyTorch + ROCm for AMD GPU acceleration
"""
import sys
import json
import os
import whisper
import torch
from pathlib import Path

# Add ffmpeg from Pensieve's extra folder to PATH
# In packaged app, the script is in the same directory as ffmpeg (extraResources)
# In dev, the script is in scripts/ and ffmpeg is in extra/
script_dir = Path(__file__).parent

# Check if we're in the packaged app (script and ffmpeg in same dir)
if (script_dir / "ffmpeg.exe").exists():
    extra_dir = script_dir
else:
    # Dev environment - go up one level and into extra/
    extra_dir = script_dir.parent / "extra"

if extra_dir.exists():
    os.environ["PATH"] = str(extra_dir) + os.pathsep + os.environ.get("PATH", "")

def transcribe_audio(audio_path, model_name="base", language=None):
    """
    Transcribe audio file using Whisper with GPU acceleration
    
    Args:
        audio_path: Path to audio file
        model_name: Whisper model size (tiny, base, small, medium, large)
        language: Language code (e.g., 'en', 'es') or None for auto-detect
    
    Returns:
        dict: Transcription result with text and segments
    """
    # Check GPU availability
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}", file=sys.stderr)
    
    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        print(f"GPU: {gpu_name}", file=sys.stderr)
    
    # Load model
    print(f"Loading Whisper {model_name} model...", file=sys.stderr)
    model = whisper.load_model(model_name, device=device)
    
    # Transcribe with progress callback
    print(f"Transcribing: {audio_path}", file=sys.stderr)
    
    # Note: whisper doesn't provide built-in progress callback,
    # but we can at least indicate start/end
    print("Progress: 0%", file=sys.stderr)
    
    result = model.transcribe(
        str(audio_path),
        language=language,
        fp16=(device == "cuda"),  # Use FP16 on GPU for faster inference
        verbose=False  # Suppress whisper's own output
    )
    
    print("Progress: 100%", file=sys.stderr)
    
    return result

def main():
    if len(sys.argv) < 2:
        print("Usage: python whisper_transcribe.py <audio_file> [model] [language]", file=sys.stderr)
        print("Models: tiny, base, small, medium, large", file=sys.stderr)
        sys.exit(1)
    
    audio_path = Path(sys.argv[1])
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        result = transcribe_audio(audio_path, model_name, language)
        
        # Output result as JSON to stdout (for Pensieve to parse)
        output = {
            "text": result["text"].strip(),
            "language": result["language"],
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip()
                }
                for seg in result["segments"]
            ]
        }
        
        print(json.dumps(output, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
