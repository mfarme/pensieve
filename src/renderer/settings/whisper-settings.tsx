import { FC } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Badge,
  Button,
  Flex,
  Heading,
  RadioCards,
  Text,
} from "@radix-ui/themes";
import { useFormContext } from "react-hook-form";
import { GoLinkExternal } from "react-icons/go";
import { modelData } from "../../model-data";
import { Settings } from "../../types";
import { mainApi } from "../api";
import { SettingsTextField } from "./settings-text-field";
import { SettingsSwitchField } from "./settings-switch-field";
import { SettingsTab } from "./tabs";
import { SettingsField } from "./settings-field";
import { SettingsSelectField } from "./settings-select-field";

export const WhisperSettings: FC = () => {
  const form = useFormContext<Settings>();

  return (
    <Tabs.Content value={SettingsTab.Whisper}>
      <Heading>PyTorch Whisper Transcription Model</Heading>
      <Text as="p">
        Select the Whisper AI model for audio transcription. Models will be
        downloaded automatically on first use by PyTorch. Larger models require
        more GPU memory and processing time but produce better results.
      </Text>
      <Text as="p" mt=".3rem">
        English-only models (.en) are optimized for English audio and may provide
        better results for English-only content. The "turbo" model is a faster
        variant of large-v3.
      </Text>

      <RadioCards.Root
        defaultValue={form.getValues()?.whisper?.model}
        onValueChange={(v) => form.setValue("whisper.model", v)}
        columns={{ initial: "1", xs: "1", sm: "2", md: "3", lg: "5" }}
        mt="1rem"
      >
        {Object.values(modelData).map((model) => (
          <RadioCards.Item key={model.name} value={model.name}>
            <Flex direction="column" width="100%">
              <Text weight="bold">{model.name}</Text>
              <Flex mt="4px" gap=".2rem" wrap="wrap">
                <Badge color="blue">{model.size}</Badge>
                {model.isEnglishOnly && <Badge color="green">English</Badge>}
              </Flex>
            </Flex>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>

      <SettingsField
        label="More information"
        description="PyTorch Whisper models are downloaded from OpenAI's official model repository on first use."
      >
        <Flex gap="0.5rem">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await mainApi.openWeb(
                "https://github.com/openai/whisper",
              );
            }}
          >
            <GoLinkExternal /> OpenAI Whisper on GitHub
          </Button>
        </Flex>
      </SettingsField>

      <Heading mt="2rem">PyTorch Configuration</Heading>

      <SettingsSelectField
        label="Device"
        description="Select device for inference. 'auto' will use GPU if available, otherwise CPU."
        form={form}
        field="whisper.device"
        values={{
          auto: "Auto (GPU if available)",
          cuda: "GPU (CUDA)",
          cpu: "CPU",
        }}
      />

      <SettingsSwitchField
        form={form}
        field="whisper.fp16"
        label="FP16 Precision"
        description="Use half-precision (FP16) on GPU for faster inference with minimal quality loss"
      />

      <SettingsTextField
        {...form.register("whisper.temperature")}
        label="Temperature"
        description="Sampling temperature (0 = greedy/deterministic, higher = more random). Use 0 for most accurate results."
        type="number"
        step="0.1"
      />

      <SettingsTextField
        {...form.register("whisper.compressionRatioThreshold")}
        label="Compression Ratio Threshold"
        description="Gzip compression ratio threshold for failed decoding detection. Higher values are more permissive."
        type="number"
        step="0.1"
      />

      <SettingsTextField
        {...form.register("whisper.logprobThreshold")}
        label="Log Probability Threshold"
        description="Average log probability threshold for failed decoding detection. Values closer to 0 are more permissive."
        type="number"
        step="0.1"
      />

      <SettingsTextField
        {...form.register("whisper.noSpeechThreshold")}
        label="No Speech Threshold"
        description="Probability threshold for detecting segments with no speech. Lower values detect more speech."
        type="number"
        step="0.1"
      />

      <SettingsSwitchField
        form={form}
        field="whisper.conditionOnPreviousText"
        label="Condition on Previous Text"
        description="Use previous segment text as context for better continuity and accuracy"
      />

      <SettingsTextField
        {...form.register("whisper.initialPrompt")}
        label="Initial Prompt"
        description="Optional text to guide the model's style and context. Can include names, terminology, or formatting hints."
      />

      <SettingsSwitchField
        form={form}
        field="whisper.wordTimestamps"
        label="Word-level Timestamps"
        description="Extract timestamps for individual words (increases processing time)"
      />

      <Heading mt="2rem">Language Settings</Heading>

      <SettingsTextField
        {...form.register("whisper.language")}
        label="Language"
        description='Spoken language code (e.g., "en", "es", "fr") or "auto" for automatic detection.'
      />

      <SettingsSwitchField
        form={form}
        field="whisper.translate"
        label="Translate to English"
        description="Translate transcription from source language to English"
      />

      <SettingsSwitchField
        form={form}
        field="whisper.diarize"
        label="Diarize Speakers"
        description="Split microphone and screen audio into separate speakers in transcript"
      />
    </Tabs.Content>
  );
};
