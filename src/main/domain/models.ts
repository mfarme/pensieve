// PyTorch Whisper models are downloaded automatically by the Python script
// This module now only manages model listing and validation
import fs from "fs-extra";
import path from "path";
import { app } from "electron";
import log from "electron-log/main";
import { modelData } from "../../model-data";
import { getSettings } from "./settings";
import * as postprocess from "./postprocess";

const modelFolder = path.join(app.getPath("userData"), "models");

// Legacy function kept for backward compatibility but not used for PyTorch
export const validateModelUrl = (url: string) => {
  return url.startsWith("https://huggingface.co/");
};

// Legacy download function - PyTorch Whisper downloads models automatically
export const downloadModel = async (url: string, modelFile: string) => {
  log.info("PyTorch Whisper downloads models automatically - skipping manual download");
  // Models are automatically downloaded by whisper.load_model()
  return Promise.resolve();
};

export const getModels = async () => {
  // Return list of known PyTorch models
  return Object.keys(modelData);
};

export const hasModel = async (modelId: string) => {
  // PyTorch Whisper downloads models automatically on first use
  // Just check if it's a valid model name
  return modelId in modelData;
};

export const getModelPath = (modelId: string) => {
  // PyTorch models are stored in the Python cache, not in our models folder
  // Return the model ID as-is for use with whisper.load_model()
  return modelId;
};

export const prepareConfiguredModel = async () => {
  const { model } = (await getSettings()).whisper;
  
  // Check if it's a valid model name
  if (!(model in modelData)) {
    throw new Error(`Model "${model}" is not a valid PyTorch Whisper model. Available models: ${Object.keys(modelData).join(", ")}`);
  }
  
  log.info(`Using PyTorch Whisper model: ${model}`);
  log.info("Model will be downloaded automatically by PyTorch on first use if not already cached");
  
  // No need to download - PyTorch does this automatically
  postprocess.setProgress("modelDownload", 1);
  return model;
};
