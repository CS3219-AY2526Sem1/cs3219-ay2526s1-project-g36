import { useTheme } from "../../../../context/ThemeContext";

interface UserRankProps {
  rank: number | null;
}

export default function UserRank({ rank }: UserRankProps) {
  const { theme } = useTheme();

  return (
    <span
      className="pt-6 text-lg font-medium"
      style={{ color: theme.textSecondary }}
    >
      Your rank:{" "}
      <strong style={{ color: theme.text }}>
        {rank ? `#${rank}` : "—"}
      </strong>
    </span>
  );
}
