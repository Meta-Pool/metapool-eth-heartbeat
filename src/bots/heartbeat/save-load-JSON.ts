import { writeFileSync, readFileSync } from 'fs'
import { PersistentData } from '.'

export function saveJSON<T>(data: T): void {
    writeFileSync("persistent.json", JSON.stringify(data))
}

export function loadJSON(): PersistentData {
    try {
        const buff = readFileSync("persistent.json")
        return JSON.parse(buff.toString()) as PersistentData
    }
    catch (ex) {
        console.error(JSON.stringify(ex))
        return {} as PersistentData
    }
}
