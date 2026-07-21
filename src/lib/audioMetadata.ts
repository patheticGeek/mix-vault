import { parseBlob } from "music-metadata";

export interface AudioFileMetadata {
  title?: string;
  recordedAt?: Date;
}

// Reads ID3/Vorbis/etc. tags embedded in the file, so a track's title and
// recording date can be pre-filled from files that already carry that info
// (most exported DJ mixes and recordings do).
export async function extractAudioMetadata(file: File): Promise<AudioFileMetadata> {
  try {
    const { common } = await parseBlob(file);
    const recordedAt = common.date ? new Date(common.date) : common.year ? new Date(common.year, 0, 1) : undefined;

    return {
      title: common.title?.trim() || undefined,
      recordedAt: recordedAt && !Number.isNaN(recordedAt.getTime()) ? recordedAt : undefined,
    };
  } catch {
    // Not all files carry (parseable) metadata — that's fine, just skip it.
    return {};
  }
}
