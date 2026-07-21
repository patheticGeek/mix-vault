import { parseBlob } from "music-metadata";

export interface AudioFileMetadata {
  recordedAt?: Date;
}

// Reads ID3/Vorbis/etc. tags embedded in the file, so a track's recording
// date can be pre-filled from files that already carry that info (most
// exported DJ mixes and recordings do). Title is intentionally not read from
// tags — it's derived from the file name instead, since embedded titles are
// often stale or missing.
export async function extractAudioMetadata(file: File): Promise<AudioFileMetadata> {
  try {
    const { common } = await parseBlob(file);
    const recordedAt = common.date ? new Date(common.date) : common.year ? new Date(common.year, 0, 1) : undefined;

    return {
      recordedAt: recordedAt && !Number.isNaN(recordedAt.getTime()) ? recordedAt : undefined,
    };
  } catch {
    // Not all files carry (parseable) metadata — that's fine, just skip it.
    return {};
  }
}
