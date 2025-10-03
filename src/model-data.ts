// PyTorch Whisper models - downloaded automatically on first use
const defineModel = (name: string, size: string, isEnglishOnly: boolean = false) => ({
  name,
  size,
  isEnglishOnly,
});

export const modelData = [
  defineModel("tiny", "~39MB", false),
  defineModel("tiny.en", "~39MB", true),
  defineModel("base", "~74MB", false),
  defineModel("base.en", "~74MB", true),
  defineModel("small", "~244MB", false),
  defineModel("small.en", "~244MB", true),
  defineModel("medium", "~769MB", false),
  defineModel("medium.en", "~769MB", true),
  defineModel("large", "~1550MB", false),
  defineModel("large-v1", "~1550MB", false),
  defineModel("large-v2", "~1550MB", false),
  defineModel("large-v3", "~1550MB", false),
  defineModel("turbo", "~809MB", false),
].reduce(
  (acc, model) => {
    acc[model.name] = model;
    return acc;
  },
  {} as Record<string, ReturnType<typeof defineModel>>,
);
