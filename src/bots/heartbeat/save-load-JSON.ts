import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

const DB_PATH = "db/"

export function saveJSON<T>(data: T, filename: string): void {
    writeFileSync(DB_PATH + filename, JSON.stringify(data))
}

export function loadJSON<T>(filename: string, isArray: boolean = false): T {
    filename = DB_PATH + filename
    try {
        if(!existsSync(DB_PATH)) {
            mkdirSync(DB_PATH)
        }
        if(!existsSync(filename)) {
            const initValue = isArray ? "[]" : "{}"
            writeFileSync(filename, initValue)
        }
        
        const buff = readFileSync(filename)
        return JSON.parse(buff.toString()) as T
    }
    catch (ex) {
        console.error(JSON.stringify(ex))
        return {} as T
    }
}
