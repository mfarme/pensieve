import { getSettings } from "./settings";

const request = async <T = any>(target: string, body?: any) => {
  const { llm } = await getSettings();
  const [method, url] = target.split(" ", 2);
  const result = await fetch(
    `${llm.providerConfig.lmstudio.chatModel.baseUrl}${url}`,
    {
      method,
      body:
        method === "GET"
          ? undefined
          : JSON.stringify({ ...body, stream: false }),
    },
  );
  if (!result.ok) {
    throw new Error(`Failed to fetch ${target}: ${result.statusText}`);
  }
  return result.json() as T;
};

const getModels = async () =>
  request<{ data: { id: string }[] }>("GET /v1/models");

const hasModel = async (name: string) => {
  const models = await getModels();
  return models.data.some((m) => m.id === name);
};

/**
 * Check if a model is loaded in LM Studio.
 * Unlike Ollama, LM Studio doesn't have a pull/download API.
 * Models must be manually loaded in the LM Studio application.
 */
export const checkModel = async (name: string) => {
  if (await hasModel(name)) {
    return;
  }

  throw new Error(
    `Model "${name}" is not loaded in LM Studio. Please load the model in the LM Studio application first.`,
  );
};
