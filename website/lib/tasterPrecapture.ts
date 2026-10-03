/**
 * Pre-capture before TeamUp is off until Jamie approves the extra step.
 * Turning this on also needs Worker variable TASTER_PRECAPTURE=1.
 * While it is off, Book Free Taster links go straight to TeamUp.
 */
export const TASTER_PRECAPTURE_ENABLED = false;

export const TASTER_CLICK_TAG = 'website taster click';
export const TASTER_CLICK_SOURCE = 'Website taster click';

type PrecaptureListener = (destination: string) => void;

let listener: PrecaptureListener | null = null;

export function subscribeTasterPrecapture(next: PrecaptureListener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

export function requestTasterPrecapture(destination: string): void {
  listener?.(destination);
}

/** Leaves the link alone while precapture is off. */
export function onFreeTasterClick(event: { preventDefault(): void }, destination: string): void {
  if (!TASTER_PRECAPTURE_ENABLED) return;
  event.preventDefault();
  requestTasterPrecapture(destination);
}
