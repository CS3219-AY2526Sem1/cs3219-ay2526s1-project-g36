const lightTheme = {
  id: "light",

  // Base colors
  background: "#F5F6FA",     // Softer off-white background (less harsh)
  surface: "#FFFFFF",        // Clean white for elevated containers
  primary: "#171EF1",        // Brand Blue (consistent with dark mode)
  primaryHover: "#0E10A6",   // Darker blue for hover
  accent: "#EFB700",         // Slightly warmer yellow (less glaring)
  text: "#1E293B",           // Deep slate gray — good readability
  textSecondary: "#64748B",  // Subtle muted gray-blue for secondary text
  error: "#DC2626",          // Calmer red tone
  border: "#E2E8F0",         // Softer neutral border gray

  // Component-level tokens
  button: {
    background: "#171EF1",
    hover: "#0E10A6",
    text: "#FFFFFF",
  },
  input: {
    background: "#FFFFFF",
    border: "#CBD5E1",       // Slightly darker for contrast
    text: "#1E293B",
    placeholder: "#94A3B8",  // Softer gray-blue
    focusBorder: "#171EF1",
  },
  card: {
    background: "#FFFFFF",
    shadow: "0 4px 10px rgba(0, 0, 0, 0.08)", // More natural depth
  },
};

export default lightTheme;
