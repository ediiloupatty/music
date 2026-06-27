import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// White equalizer bars as a data-URI SVG (Satori renders this reliably via <img>)
const note =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='white'><rect x='90' y='181' width='44' height='150' rx='22'/><rect x='162' y='131' width='44' height='250' rx='22'/><rect x='234' y='86' width='44' height='340' rx='22'/><rect x='306' y='146' width='44' height='220' rx='22'/><rect x='378' y='191' width='44' height='130' rx='22'/></svg>`
  );

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 55%, #0d9488 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={note} width={104} height={104} alt="Zenify" />
      </div>
    ),
    { ...size }
  );
}
