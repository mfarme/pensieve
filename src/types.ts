import { app } from "electron";
import path from "path";
import { datahookMarkdownTemplate } from "./datahooks-defaults";

export type RecordingConfig = {
  recordScreenAudio?: boolean;
  mic?: MediaDeviceInfo;
};

export type RecordingData = {
  mic?: ArrayBuffer | null;
  screen?: ArrayBuffer | null;
  meta: RecordingMeta;
};

export type RecordingMeta = {
  started: string;
  duration?: number;
  name?: string;
  isPostProcessed?: boolean;
  isImported?: boolean;
  hasRawRecording?: boolean;
  hasMic?: boolean;
  hasScreen?: boolean;
  language?: string;
  notes?: string;
  timestampedNotes?: Record<number, string>;
  highlights?: number[];
  screenshots?: Record<number, string>;
  summary?: {
    summary?: string | null;
    actionItems?: { isMe: boolean; action: string; time: number }[] | null;
    sentenceSummary?: string | null;
  };
  isPinned?: boolean;
};

export type RecordingTranscript = {
  result: { language: string };
  transcription: RecordingTranscriptItem[];
};

export type RecordingTranscriptItem = {
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  text: string;
  speaker: string;
};

export type PostProcessingStep =
  | "modelDownload"
  | "wav"
  | "mp3"
  | "whisper"
  | "summary"
  | "datahooks";

export type PostProcessingJob = {
  recordingId: string;
  steps?: PostProcessingStep[];
  error?: string;
  isDone?: boolean;
  isRunning?: boolean;
};

export const defaultSettings = {
  core: { recordingsFolder: path.join(app.getPath("userData"), "recordings") },
  ui: {
    dark: true,
    autoStart: true,
    trayRunningNotificationShown: false,
    useOverlayTool: true,
  },
  llm: {
    enabled: true,
    prompt: "",
    features: {
      summary: true,
      actionItems: true,
      sentenceSummary: true,
    },
    useEmbedding: true,
    provider: "ollama" as "ollama" | "openai" | "lmstudio",
    providerConfig: {
      ollama: {
        chatModel: {
          baseUrl: "http://localhost:11434",
          model: "llama2:latest",
        },
        embeddings: {
          model: "nomic-embed-text",
          maxConcurrency: 5,
        },
      },
      openai: {
        useCustomUrl: false,
        chatModel: {
          apiKey: "YOUR_API_KEY",
          model: "gpt-3.5-turbo",
          configuration: {
            baseURL: undefined,
          },
        },
        embeddings: {
          model: "text-embedding-3-large",
          dimensions: 1536,
          batchSize: 20,
        },
      },
      lmstudio: {
        chatModel: {
          baseUrl: "http://localhost:1234",
          model: "",
        },
        embeddings: {
          model: "",
          batchSize: 20,
        },
      },
    },
  },
  ffmpeg: {
    removeRawRecordings: true,
    autoTriggerPostProcess: true,

    stereoWavFilter:
      "[0:a][1:a] amerge=inputs=2, pan=stereo|c0<c0+c1|c1<c2+c3, highpass=f=300, lowpass=f=3000 [a]",
    mp3Filter: "amix=inputs=2:duration=longest",
  },
  whisper: {
    model: "base",
    language: "auto",
    translate: false,
    diarize: true,
    // PyTorch-specific settings
    device: "auto", // "auto", "cuda", "cpu"
    fp16: true, // Use FP16 precision on GPU for faster inference
    temperature: 0, // Temperature for sampling (0 = greedy, higher = more random)
    compressionRatioThreshold: 2.4, // Gzip compression ratio threshold for failed decoding
    logprobThreshold: -1.0, // Log probability threshold for failed decoding
    noSpeechThreshold: 0.6, // Probability threshold for no speech detection
    conditionOnPreviousText: true, // Condition on previous text for better context
    initialPrompt: "", // Initial prompt to guide the model
    wordTimestamps: false, // Extract word-level timestamps
  },
  datahooks: {
    enabled: false,
    features: {
      exportMarkdown: true,
      exportJson: false,
      exportMp3: true,
      exportAssets: true,
      callCmdlet: false,
    },
    markdownTemplate: datahookMarkdownTemplate,
    markdownPath:
      "{{homedir}}\\Desktop\\Pensieve Recordings\\\\{{keydate date}} - {{pathsafe name}}.md",
    jsonPath:
      "{{homedir}}\\Desktop\\Pensieve Recordings\\\\{{keydate date}}.json",
    mp3Path:
      "{{homedir}}\\Desktop\\Pensieve Recordings\\\\{{keydate date}} - {{pathsafe name}}.mp3",
    assetPath:
      "{{homedir}}\\Desktop\\Pensieve Recordings\\assets\\\\{{keydate date}}_{{timestamp}}{{ext}}",
    callCmdlet: 'echo "Recording stored to {{date}}."',
  },
};

export type Settings = typeof defaultSettings;

export type ScreenshotArea = {
  displayId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RecordingIpcState = {
  meta: RecordingMeta | undefined;
  isRecording: boolean;
  isPaused: boolean;
};

export type RecordingIpcEvents = {
  addTimestampedNote: () => void;
  addHighlight: () => void;
  addScreenshot: () => void;
  setMeta: (meta: Partial<RecordingMeta>) => void;
  abort: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};
