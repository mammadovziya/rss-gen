import { ImageResponse } from "next/og";

export const alt = "RSS Gen visual RSS feed generator";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07080a",
          color: "#f4f4f5",
          padding: 64,
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#c6c6cc"
          }}
        >
          <span>RSS Gen</span>
          <span>mammadovziya/rss-gen</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 82, fontWeight: 800, letterSpacing: 0, lineHeight: 1 }}>
            Visual RSS feed generator
          </div>
          <div style={{ width: 820, fontSize: 34, color: "#a1a1aa", lineHeight: 1.25 }}>
            Create custom RSS feeds from websites without native feeds.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            color: "#c6c6cc",
            fontSize: 24
          }}
        >
          <span>Pick cards</span>
          <span>/</span>
          <span>Select fields</span>
          <span>/</span>
          <span>Export RSS</span>
        </div>
      </div>
    ),
    size
  );
}
