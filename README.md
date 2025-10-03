# Pensieve

> Desktop app for recording meetings or memos from locally running apps and transcribing and summarizing them with a local LLM. My fork modifies the original to use GPU accelerated Whisper using Pytorch, extends transcription length capability, and allows for LM Studio as an alternative to Ollama for summarization and embeddings. 

<div align="center">
    <a href="https://github.com/lukasbach/pensieve/releases/latest">
        Download the latest release
    </a>
</div>
<br />

# API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/?utm_source=github&utm_medium=sponsorship&utm_campaign=pensieve), an API that records Zoom, Google Meet, Microsoft Teams, In-person meetings, and more.

# Pensieve App

<div align="center">
    <img src="https://github.com/lukasbach/pensieve/raw/main/images/preview.png" alt="Preview image of Pensieve" />
</div>
<br />

Pensieve is a local-only desktop app for recording meetings, discussions, memos or other audio
snippets from locally running applications for you to always go back and review your
previous discussions.

It uses a bundled Whisper instance to transcribe the audio locally, and optionally
summarizes the transcriptions with an LLM. You can connect a local Ollama instance to
be used for summarization, or provide an OpenAI key and have ChatGPT summarize the
transcriptions for you.

If you choose Ollama for summarization (or disable summarization entirely), all your
data stays on your machine and is never sent to any external service. You can record
as many meetings as you want, and manage your data yourself without any external
providers involved.

Pensieve automatically registers a tray icon and runs in the background, which
makes it easy to start and stop recordings at any time. You can also configure
Pensieve in many ways, like customizing which models to use for transcription
and summarization, or various audio processing settings.

<div align="center">
    <a href="https://github.com/lukasbach/pensieve/releases/latest">
        Download the latest release
    </a>
</div>

## Issue reporting

If you encounter any issues or bugs with Pensieve, please report them as issue.
Please provide the log files from your local installation, which is stored in
the `%USERPROFILE%\AppData\Roaming\Pensieve\logs\main.log` folder.
