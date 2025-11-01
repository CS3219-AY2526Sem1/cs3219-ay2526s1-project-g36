import { useTheme } from "../../../../context/ThemeContext";

interface RankingRowProps {
  rank: number;
  username: string;
  solved: number;
  rating: number;
}

export default function RankingRow({ rank, username, solved, rating }: RankingRowProps) {
  const { theme } = useTheme();

  return (
    <tr
      className="transition hover:scale-[1.01] hover:shadow-sm"
      style={{
        backgroundColor: theme.surface,
        fontFamily: "Inter, system-ui, sans-serif",
        color:
            rank === 1
            ? "#FFD700" // gold
            : rank === 2
            ? "#C0C0C0" // silver
            : rank === 3
            ? "#CD7F32" // bronze
            : theme.textSecondary,
      }}
    >
      {/* Rank - centered */}
      <td
        className="p-3 border-b text-center font-extrabold tracking-wide"
        style={{
          borderColor: theme.border,
          textAlign: "center",
          fontSize: "1.05rem",
          color:
            rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : theme.text,
        }}
      >
        {rank}
      </td>

      {/* Username - left */}
      <td
        className="p-3 border-b text-left font-semibold"
        style={{
          borderColor: theme.border,
          textAlign: "left",
          fontSize: "1rem",
          letterSpacing: "0.01em",
        }}
      >
        {username}
      </td>

      {/* Problems Solved - center */}
      <td
        className="p-3 border-b text-center text-sm font-medium"
        style={{
          borderColor: theme.border,
          textAlign: "center",
        }}
      >
        {solved}
      </td>

      {/* Rating - right, monospace */}
      <td
        className="p-3 border-b text-right font-semibold"
        style={{
          borderColor: theme.border,
          textAlign: "right",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.95rem",
        }}
      >
        {rating}
      </td>
    </tr>
  );
}
