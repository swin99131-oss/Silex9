export default function Logo({
  variant = "dark",
  size = "md",
}: {
  variant?: "dark" | "light";
  size?: "md" | "lg" | "responsive";
}) {
  const color = variant === "light" ? "#FAF8F5" : "#111111";

  // إعداد الأحجام الديناميكية للشاشات المختلفة
  const textSize =
    size === "responsive"
      ? "text-[24px] sm:text-[32px] md:text-[42px] lg:text-[50px]"
      : size === "lg"
      ? "text-[32px] md:text-[40px]"
      : "text-[22px] md:text-[26px]";

  const iconClass =
    size === "responsive"
      ? "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14"
      : size === "lg"
      ? "w-9 h-9 md:w-10 md:h-10"
      : "w-7 h-7 md:w-8 md:h-8";

  return (
    <div className="flex items-center gap-2 md:gap-3.5 select-none">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
      >
        <path
          d="M20 2C11.2 8 6 15 6 22.5C6 30.5 12.3 37 20 37C27.7 37 34 30.5 34 22.5C34 15 28.8 8 20 2Z"
          fill={color}
        />
        <path
          d="M20 12C16 16 13.5 19.8 13.5 23.5C13.5 27.6 16.4 31 20 31"
          stroke={variant === "light" ? "#111111" : "#FAF8F5"}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className={`font-display leading-none transition-all ${textSize}`}
        style={{ color }}
      >
        Salix
      </span>
    </div>
  );
}