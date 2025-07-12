export const formatMAC = (value: string) => {
    return value
      .replace(/[^a-fA-F0-9]/g, "")
      .toUpperCase()
      .substring(0, 12)
      .replace(/(.{2})(?!$)/g, "$1:");
  };