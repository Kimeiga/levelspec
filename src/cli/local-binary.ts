import { constants } from "node:fs";
import { open } from "node:fs/promises";

/** Reads one regular local file with bounded allocation and growth detection; always closes its handle. */
export async function readBoundedFile(
  filename: string,
  maximumBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  signal?.throwIfAborted();
  const file = await open(filename, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > maximumBytes)
      throw new Error(
        "Companion file is not regular or exceeds its encoded byte budget.",
      );
    const buffer = new Uint8Array(Math.min(info.size + 1, maximumBytes + 1));
    let length = 0;
    while (length < buffer.length) {
      signal?.throwIfAborted();
      const read = await file.read(
        buffer,
        length,
        Math.min(65536, buffer.length - length),
        length,
      );
      if (!read.bytesRead) break;
      length += read.bytesRead;
    }
    if (length > maximumBytes || length > info.size)
      throw new Error(
        "Companion grew beyond its admitted file size while loading.",
      );
    const bytes = buffer.subarray(0, length);
    return bytes;
  } finally {
    await file.close();
  }
}
