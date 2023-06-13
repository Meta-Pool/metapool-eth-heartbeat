import { writeFileSync, readFileSync, existsSync } from 'fs'
import { PersistentData } from '.'

export function saveJSON<T>(data: T, filename: string): void {
    writeFileSync(filename, JSON.stringify(data))
}

export function loadJSON<T>(filename: string): T {
    try {
        if(!existsSync(filename)) {
            writeFileSync(filename, "{}")
        }
        
        const buff = readFileSync(filename)
        return JSON.parse(buff.toString()) as T
    }
    catch (ex) {
        console.error(JSON.stringify(ex))
        return {} as T
    }
}
