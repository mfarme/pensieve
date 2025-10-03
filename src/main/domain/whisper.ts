import path from "path";
import fs from "fs/promises";
import log from "electron-log/main";
import {
  buildArgs,
  getExtraResourcesFolder,
  getMillisecondsFromTimeString,
} from "../../main-utils";
import { getModelPath } from "./models";
import * as ffmpeg from "./ffmpeg";
import * as runner from "./runner";
import * as postprocess from "./postprocess";
import { getSettings } from "./settings";

// Path to Python 3.12 (Windows py launcher)
const pythonPath = "py";
const pythonArgs = ["-3.12"];

// Path to our GPU-accelerated Whisper script
// In production, the script is copied to extraResources during packaging
// In dev mode, it's in the scripts/ folder
const whisperScriptPath = process.env.NODE_ENV === "development"
  ? path.join(__dirname, "../../scripts", "whisper_transcribe.py")
  : path.join(getExtraResourcesFolder(), "whisper_transcribe.py");

export const processWavFile = async (
  input: string,
  output: string,
  modelId: string,
) => {
  postprocess.setStep("whisper");

  const out = path.join(
    path.dirname(output),
    path.basename(output, path.extname(output)),
  );
  const inputTime = await ffmpeg.getDuration(input);

  const settings = (await getSettings()).whisper;
  
  // modelId is now the PyTorch model name directly (e.g., "base", "large-v3", "turbo")
  const modelSize = modelId;
  
  // Build arguments for Python Whisper script with PyTorch parameters
  const args = [
    ...pythonArgs,
    whisperScriptPath,
    input,
    modelSize,
    settings.language === "auto" ? "" : settings.language, // Empty string for auto-detection
    "--device", settings.device,
    "--temperature", settings.temperature.toString(),
    "--compression_ratio_threshold", settings.compressionRatioThreshold.toString(),
    "--logprob_threshold", settings.logprobThreshold.toString(),
    "--no_speech_threshold", settings.noSpeechThreshold.toString(),
  ];
  
  // Add optional flags
  if (!settings.fp16) {
    args.push("--no-fp16");
  }
  if (settings.translate) {
    args.push("--translate");
  }
  if (!settings.conditionOnPreviousText) {
    args.push("--no-condition-on-previous-text");
  }
  if (settings.wordTimestamps) {
    args.push("--word-timestamps");
  }
  if (settings.initialPrompt) {
    args.push("--initial-prompt", settings.initialPrompt);
  }

  log.info("Processing wav file with GPU-accelerated Whisper", pythonPath, args);

  let transcriptionResult = "";
  
  const whisperProcess = runner.execute(pythonPath, args, {
    cwd: getExtraResourcesFolder(),
    env: {
      ...process.env,
      PATH: `${getExtraResourcesFolder()};${process.env.PATH}`,
    },
  });
  
  // Capture stdout for JSON result
  // NOTE: Previously we only appended chunks that started with '{', which
  // caused large JSON outputs to be truncated at buffer boundaries (e.g. 64KB).
  // Instead, accumulate all stdout chunks and attempt to parse the full
  // buffered string after the child process exits.
  whisperProcess.stdout?.on("data", (data) => {
    try {
      transcriptionResult += data.toString();
    } catch (err) {
      // Defensive: if toString() fails for some reason, log a readable message
      log.error("Error decoding whisper stdout chunk:", err);
    }
  });
  
  // Log stderr for debugging
  whisperProcess.stderr?.on("data", (data) => {
    const line = data.toString();
    log.info("Whisper:", line.trim());
    
    // Try to extract progress from stderr
    // Python script outputs progress info to stderr
    const progressMatch = line.match(/(\d+)%/);
    if (progressMatch) {
      const percent = parseInt(progressMatch[1]) / 100;
      postprocess.setProgress("whisper", percent);
    }
  });
  
  await whisperProcess;
  
  // Parse JSON result and save to output file
  try {
    const result = JSON.parse(transcriptionResult);
    
    // Convert to whisper.cpp JSON format for compatibility
    const whisperFormat = {
      systeminfo: "GPU-accelerated PyTorch Whisper with ROCm",
      model: {
        type: modelSize,
        multilingual: true,
        vocab: 51864,
        audio: {}
      },
      params: {
        model: getModelPath(modelId),
        language: result.language,
        translate: settings.translate
      },
      result: {
        language: result.language
      },
      transcription: result.segments.map((seg: any) => ({
        timestamps: {
          from: formatTimestamp(seg.start),
          to: formatTimestamp(seg.end)
        },
        offsets: {
          from: Math.round(seg.start * 1000),
          to: Math.round(seg.end * 1000)
        },
        text: seg.text
      }))
    };
    
    await fs.writeFile(`${out}.json`, JSON.stringify(whisperFormat, null, 2));
    log.info("Processed Wav File with GPU acceleration");
  } catch (error) {
    // Provide better diagnostics to debug truncation / parse issues
  // Safely extract message from unknown error types for TypeScript
  const errMsg = (error as any)?.message ?? String(error);
  log.error("Failed to parse Whisper output:", errMsg);

    const len = transcriptionResult.length;
    log.error(`Raw output length: ${len}`);

    const firstBrace = transcriptionResult.indexOf("{");
    const lastBrace = transcriptionResult.lastIndexOf("}");
    log.error(`First '{' at: ${firstBrace}, last '}' at: ${lastBrace}`);

    // Show a small preview around the last brace / tail of the output to help
    // identify if the JSON was cut off at a buffer boundary.
    try {
      const previewStart = Math.max(0, lastBrace - 200);
      const previewEnd = Math.min(len, lastBrace + 200);
      const tailPreview = transcriptionResult.slice(previewStart, previewEnd);
      log.error(`Tail preview (around last brace, ${previewStart}-${previewEnd}):`);
      log.error(tailPreview);
    } catch (err) {
      log.error("Failed to create tail preview:", err);
    }

    // If possible, write the raw stdout capture to disk for offline inspection.
    try {
      await fs.writeFile(`${out}.raw.txt`, transcriptionResult);
      log.error(`Wrote raw whisper stdout to ${out}.raw.txt for debugging.`);
    } catch (err) {
      log.error("Failed to write raw whisper stdout to disk:", err);
    }

    // Re-throw the original error so upstream code can handle it as before.
    throw error;
  }
};

// Helper function to format timestamp as HH:MM:SS.mmm
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
