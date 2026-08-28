// Shared keyboard handler for the seek bars each skin renders as a
// role="slider" div/span. Arrow keys nudge by 2%, Home/End jump to the ends —
// mirrors the range a mouse drag across the bar would produce.
export function handleSeekKeyDown(
  e: React.KeyboardEvent,
  progress: number,
  onSeek: (fraction: number) => void,
) {
  const STEP = 0.02;
  switch (e.key) {
    case "ArrowLeft":
    case "ArrowDown":
      e.preventDefault();
      onSeek(Math.max(0, progress - STEP));
      break;
    case "ArrowRight":
    case "ArrowUp":
      e.preventDefault();
      onSeek(Math.min(1, progress + STEP));
      break;
    case "Home":
      e.preventDefault();
      onSeek(0);
      break;
    case "End":
      e.preventDefault();
      onSeek(1);
      break;
  }
}
