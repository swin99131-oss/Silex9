import Image from "next/image";

export function Avatar({
  url,
  name,
  size = 40,
  className = "",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const letter = (name ?? "").trim().charAt(0) || "؟";
  return (
    <div
      className={`relative rounded-full overflow-hidden bg-chip shrink-0 flex items-center justify-center font-display ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {url ? (
        <Image src={url} alt={name ?? ""} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        letter
      )}
    </div>
  );
}
