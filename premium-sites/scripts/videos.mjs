import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
await mkdir("public/videos", { recursive: true });
for (const name of ["estate-hero", "restaurant-hero", "garden-hero"]) {
  const result = spawnSync(
    ffmpeg.path,
    [
      "-y",
      "-loop",
      "1",
      "-i",
      `public/images/${name}.jpg`,
      "-vf",
      "scale=1600:-2,crop=1600:900,zoompan=z='1.035+0.015*sin(on/240*3.14159265)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24",
      "-t",
      "10",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `public/videos/${name}.mp4`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(`Film d’ambiance : ${name}`);
}
