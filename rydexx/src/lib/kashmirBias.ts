export const KASHMIR_CENTER_LAT = 34.0837;
export const KASHMIR_CENTER_LNG = 74.7973;
export const KASHMIR_RADIUS_METERS = 50000; // 50 km

export const isKashmirLocation = (name: string): boolean => {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes("kashmir") ||
    n.includes("srinagar") ||
    n.includes("budgam") ||
    n.includes("chadoora") ||
    n.includes("humhama") ||
    n.includes("chanapora") ||
    n.includes("dal lake") ||
    n.includes("j&k") ||
    n.includes("jammu") ||
    n.includes("anantnag") ||
    n.includes("baramulla") ||
    n.includes("pulwama") ||
    n.includes("shopian") ||
    n.includes("kulgam") ||
    n.includes("bandipora") ||
    n.includes("kupwara") ||
    n.includes("ganderbal")
  );
};

export const sortKashmirResultsFirst = <T,>(results: T[]): T[] => {
  return results.sort((a: any, b: any) => {
    const nameA = a?.address || a?.name || "";
    const nameB = b?.address || b?.name || "";
    
    const aK = isKashmirLocation(nameA);
    const bK = isKashmirLocation(nameB);
    
    if (aK && !bK) return -1;
    if (!aK && bK) return 1;
    return 0;
  });
};
