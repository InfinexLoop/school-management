export const inr = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
export const shortDate = (date: Date | string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(date));
export const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
