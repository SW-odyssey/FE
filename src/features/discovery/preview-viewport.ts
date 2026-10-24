/** Keep the 393×852 screen and its 10px frame inside the available preview. */
export function fitPhoneScale(width: number, height: number): number {
  return Math.max(0.1, Math.min(1, (width - 32) / 413, (height - 32) / 872));
}
