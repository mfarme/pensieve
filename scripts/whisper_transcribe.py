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

# Force UTF-8 encoding for stdout to handle Unicode characters in transcriptions
# This prevents 'charmap' codec errors on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

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

def transcribe_audio(audio_path, model_name="base", language=None, device="auto",
                     temperature=0, compression_ratio_threshold=2.4, 
                     logprob_threshold=-1.0, no_speech_threshold=0.6,
                     fp16=True, translate=False, condition_on_previous_text=True,
                     initial_prompt=None, word_timestamps=False):
    """
    Transcribe audio file using Whisper with GPU acceleration
    
    Args:
        audio_path: Path to audio file
        model_name: Whisper model size (tiny, base, small, medium, large, turbo)
        language: Language code (e.g., 'en', 'es') or None/empty for auto-detect
        device: Device for inference ('auto', 'cuda', 'cpu')
        temperature: Sampling temperature (0 = greedy)
        compression_ratio_threshold: Gzip compression ratio threshold
        logprob_threshold: Average log probability threshold
        no_speech_threshold: Probability threshold for no-speech detection
        fp16: Use FP16 precision on GPU
        translate: Translate to English
        condition_on_previous_text: Condition on previous text
        initial_prompt: Optional initial prompt
        word_timestamps: Extract word-level timestamps
    
    Returns:
        dict: Transcription result with text and segments
    """
    # Determine device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    
    print(f"Using device: {device}", file=sys.stderr)
    
    if device == "cuda" and torch.cuda.is_available():
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
    
    # Build transcription parameters
    transcribe_params = {
        "language": language if language else None,
        "fp16": fp16 and device == "cuda",
        "verbose": False,
        "temperature": temperature,
        "compression_ratio_threshold": compression_ratio_threshold,
        "logprob_threshold": logprob_threshold,
        "no_speech_threshold": no_speech_threshold,
        "condition_on_previous_text": condition_on_previous_text,
        "word_timestamps": word_timestamps,
    }
    
    # Add optional parameters
    if translate:
        transcribe_params["task"] = "translate"
    if initial_prompt:
        transcribe_params["initial_prompt"] = initial_prompt
    
    result = model.transcribe(str(audio_path), **transcribe_params)
    
    print("Progress: 100%", file=sys.stderr)
    
    return result

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Whisper GPU Transcription")
    parser.add_argument("audio_file", help="Path to audio file")
    parser.add_argument("model", nargs="?", default="base", 
                       help="Model size (tiny, base, small, medium, large, turbo)")
    parser.add_argument("language", nargs="?", default="", 
                       help="Language code (e.g., 'en', 'es') or empty for auto-detect")
    parser.add_argument("--device", default="auto", 
                       help="Device for inference (auto, cuda, cpu)")
    parser.add_argument("--temperature", type=float, default=0, 
                       help="Sampling temperature")
    parser.add_argument("--compression_ratio_threshold", type=float, default=2.4,
                       help="Gzip compression ratio threshold")
    parser.add_argument("--logprob_threshold", type=float, default=-1.0,
                       help="Average log probability threshold")
    parser.add_argument("--no_speech_threshold", type=float, default=0.6,
                       help="Probability threshold for no-speech detection")
    parser.add_argument("--no-fp16", action="store_true",
                       help="Disable FP16 precision on GPU")
    parser.add_argument("--translate", action="store_true",
                       help="Translate to English")
    parser.add_argument("--no-condition-on-previous-text", action="store_true",
                       help="Disable conditioning on previous text")
    parser.add_argument("--initial-prompt", default="",
                       help="Initial prompt to guide the model")
    parser.add_argument("--word-timestamps", action="store_true",
                       help="Extract word-level timestamps")
    
    args = parser.parse_args()
    
    audio_path = Path(args.audio_file)
    
    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        result = transcribe_audio(
            audio_path,
            model_name=args.model,
            language=args.language if args.language else None,
            device=args.device,
            temperature=args.temperature,
            compression_ratio_threshold=args.compression_ratio_threshold,
            logprob_threshold=args.logprob_threshold,
            no_speech_threshold=args.no_speech_threshold,
            fp16=not args.no_fp16,
            translate=args.translate,
            condition_on_previous_text=not args.no_condition_on_previous_text,
            initial_prompt=args.initial_prompt if args.initial_prompt else None,
            word_timestamps=args.word_timestamps
        )
        
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
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
