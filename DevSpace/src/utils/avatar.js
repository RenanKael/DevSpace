export function avatarInitial(seed = "") {
  const text = String(seed || "?").replace(/^@+/, "").trim();
  return (text[0] || "?").toUpperCase();
}

export function avatarStyle(photo, seed = "") {
  if (photo) {
    return {
      backgroundImage: `url(${photo})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  const text = String(seed || "?").replace(/^@+/, "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    backgroundImage: `linear-gradient(145deg, hsl(${hue} 42% 34%), hsl(${(hue + 52) % 360} 48% 16%))`,
  };
}
