const PEAK_COUNT = 200;

export interface WaveformAnalysis {
  peaks: number[];
  duration: number;
}

export async function extractWaveformPeaks(file: File): Promise<WaveformAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelCount = audioBuffer.numberOfChannels;
    const samplesPerPeak = Math.max(1, Math.floor(audioBuffer.length / PEAK_COUNT));

    const peaks: number[] = [];
    for (let peakIndex = 0; peakIndex < PEAK_COUNT; peakIndex++) {
      const start = peakIndex * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, audioBuffer.length);
      let max = 0;
      for (let channel = 0; channel < channelCount; channel++) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = start; i < end; i++) {
          const abs = Math.abs(data[i]);
          if (abs > max) max = abs;
        }
      }
      peaks.push(Math.round(max * 1000) / 1000);
    }

    return { peaks, duration: audioBuffer.duration };
  } finally {
    await audioContext.close();
  }
}
