import React from "react";

/**
 * Get CSS class for name color based on profile name_color
 */
export const getNameColorClass = (nameColor: string | null | undefined): string => {
  if (!nameColor || nameColor === "default") return "";
  
  const colorMap: Record<string, string> = {
    green: "text-green-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    gold: "text-level-gold",
  };

  return colorMap[nameColor] || "";
};

/**
 * Get CSS class for avatar border based on profile border_style
 */
export const getBorderClass = (borderStyle: string | null | undefined): string => {
  if (!borderStyle || borderStyle === "default") return "border-2 border-game-green/50";
  
  const borderMap: Record<string, string> = {
    gold: "border-2 border-yellow-500 shadow-lg shadow-yellow-500/50",
    diamond: "border-2 border-cyan-300 shadow-lg shadow-cyan-300/50",
    rainbow: "border-2",
  };

  return borderMap[borderStyle] || "border-2 border-game-green/50";
};

/**
 * Get inline style for special borders (rainbow gradient)
 */
export const getBorderStyle = (borderStyle: string | null | undefined): React.CSSProperties => {
  if (borderStyle === "rainbow") {
    return {
      borderImage: "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet) 1",
      borderImageSlice: 1,
    };
  }
  return {};
};

/**
 * Get wrapper div class for rainbow border (needs gradient background)
 */
export const getRainbowBorderWrapper = (borderStyle: string | null | undefined): string => {
  if (borderStyle === "rainbow") {
    return "p-[2px] rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500";
  }
  return "";
};

