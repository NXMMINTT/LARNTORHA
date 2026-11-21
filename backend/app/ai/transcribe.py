"""Speech-to-text for the /demo voice call with Amazon Transcribe Streaming (th-TH).

The browser records 16 kHz mono 16-bit PCM and sends it once the speaker stops; this streams it
to Transcribe and returns the final text. Audio is not stored. Credentials come from boto3's
chain (SSO profile in dev, the App Runner instance role in AWS).
"""

from __future__ import annotations

import asyncio

import boto3
from amazon_transcribe.auth import CredentialResolver, Credentials
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

SAMPLE_RATE = 16_000
CHUNK = 8_000  # bytes per event (0.25 s of 16-bit audio)
MAX_BYTES = SAMPLE_RATE * 2 * 30  # 30 seconds


class _Boto3Credentials(CredentialResolver):
    async def get_credentials(self) -> Credentials | None:
        creds = boto3.Session().get_credentials()
        if creds is None:
            return None
        frozen = creds.get_frozen_credentials()
        if not frozen.access_key or not frozen.secret_key:
            return None
        return Credentials(frozen.access_key, frozen.secret_key, frozen.token)


class _Collector(TranscriptResultStreamHandler):
    def __init__(self, stream: object) -> None:
        super().__init__(stream)  # type: ignore[arg-type]
        self.parts: list[str] = []

    async def handle_transcript_event(self, transcript_event: TranscriptEvent) -> None:
        for result in transcript_event.transcript.results:
            if not result.is_partial and result.alternatives:
                self.parts.append(result.alternatives[0].transcript)


async def transcribe_pcm(pcm: bytes, region: str) -> str:
    """Return the Thai text spoken in `pcm` (16 kHz, mono, signed 16-bit little-endian)."""
    client = TranscribeStreamingClient(region=region, credential_resolver=_Boto3Credentials())
    stream = await client.start_stream_transcription(
        language_code="th-TH", media_sample_rate_hz=SAMPLE_RATE, media_encoding="pcm"
    )

    async def send() -> None:
        for i in range(0, len(pcm), CHUNK):
            await stream.input_stream.send_audio_event(audio_chunk=pcm[i : i + CHUNK])
        await stream.input_stream.end_stream()  # type: ignore[no-untyped-call]

    collector = _Collector(stream.output_stream)
    await asyncio.gather(send(), collector.handle_events())  # type: ignore[no-untyped-call]
    return " ".join(p.strip() for p in collector.parts if p.strip())
