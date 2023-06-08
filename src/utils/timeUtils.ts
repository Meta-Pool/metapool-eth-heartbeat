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
        ${seconds.toString().padStart(2, "0")}s
    `.replaceAll(/ /g, "").replaceAll(/\n/g, " ").trim()
}