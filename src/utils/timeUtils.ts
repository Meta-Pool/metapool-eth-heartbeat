export function sLeftToTimeLeft(s: number|bigint): string {
    s = Number(s.toString())
    const seconds = s % 60
    const m = (s - seconds) / 60
    const minutes = m % 60
    const h = (m - minutes) / 60
    const hours = h % 24
    const days  = (h - hours) / 24
    return `
        ${days}d
        ${hours.toString().padStart(2, "0")}h
        ${minutes.toString().padStart(2, "0")}m
        ${Math.round(seconds).toString().padStart(2, "0")}s
    `.replaceAll(/ /g, "").replaceAll(/\n/g, " ").trim()
}

export function differenceInDays(dateString1: string, dateString2: string) {
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays
}