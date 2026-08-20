const PEAK_COUNT = 200;

export interface WaveformAnalysis {
  peaks: number[];
  duration: number;
}

export function parsePeaks(waveformPreview: string): number[] {
  try {
    const parsed = JSON.parse(waveformPreview);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}

export async function extractWaveformPeaks(file: File): Promise<WaveformAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelCount = audioBuffer.numberOfChannels;
    const samplesPerPeak = Math.max(1, Math.floor(audioBuffer.length / PEAK_COUNT));

    // RMS (energy) rather than raw peak amplitude: heavily limited/mastered
    // tracks sit near-constant close to full scale on true peaks, which makes
    // peak-based waveforms look almost flat. RMS tracks perceived loudness
    // and varies much more across quiet/loud sections.
    const peaks: number[] = [];
    for (let peakIndex = 0; peakIndex < PEAK_COUNT; peakIndex++) {
      const start = peakIndex * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, audioBuffer.length);
      let sumSquares = 0;
      let sampleCount = 0;
      for (let channel = 0; channel < channelCount; channel++) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = start; i < end; i++) {
          sumSquares += data[i] * data[i];
          sampleCount++;
        }
      }
      const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
      peaks.push(Math.round(rms * 1000) / 1000);
    }

    return { peaks, duration: audioBuffer.duration };
  } finally {
    await audioContext.close();
  }
}
