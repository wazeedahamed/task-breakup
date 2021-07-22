const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require("../settings");

function getRandomArbitrary(min, max) {
    return `${Math.floor(Math.random() * (max - min) + min)}`;
}

function unid() {
    return `${Date.now()}-${getRandomArbitrary(1, 10000).padStart(5, "0")}`;
}

function sortFn({ start: a }, { start: b }) {
    return a > b ? 1 : a < b ? -1 : 0;
}

function todayFilePath() {
    const today = new Date();
    return path.join(DATA_DIR, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.json`);
}

async function isFileExist(filePath) {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            resolve(Boolean(stats));
        })
    });
}

async function readFile(filePath) {
    const hasFile = await isFileExist(filePath);
    if (hasFile) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                err ? reject(err) : resolve(JSON.parse(data).sort(sortFn));
            });
        });
    } else {
        return [];
    }
}

async function fileList(directoryPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (err, files) => {
            err ? reject(err) : resolve(files);
        })
    });
}

async function writeFile(filePath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, 'utf8', (err) => {
            err ? reject(err) : resolve(true);
        });
    });
}

function hhmm12format(hhmm) {
    const [hh, mm] = hhmm.split(":").map(Number),
        pm = hh > 11,
        hh12hr = (pm && hh > 12) ? (hh - 12) : hh;
    return `${String(hh12hr).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${pm ? "PM" : "AM"}`;
}

function hhmmmins(mins) {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0"),
        mm = String(mins % 60).padStart(2, "0");
    return `${hh}:${mm} (${mins} mins)`;
}

function formatEntry(entry) {
    entry.fullTaskName = [
        entry.task,
        (entry.subtask ? `-${entry.subtask}` : ''),
        (entry.currenttask ? ` - ${entry.currenttask}` : '')
    ].join("");
    entry.start12hr = hhmm12format(entry.start);
    entry.end12hr = hhmm12format(entry.end);
    entry.minuteshr = hhmmmins(entry.minutes);
}

async function getEntries() {
    const data = {
        ENTRIES: [],
        ENTERED_TIME: "00:00 (0 mins)",
        TOTAL_TIME: "08:00 (480 mins)"
    }
    const filePath = todayFilePath(),
        fileData = await readFile(filePath),
        totalTime = fileData.reduce((acc, entry) => {
            formatEntry(entry);
            return acc + entry.minutes;
        }, 0),
        hours = Math.floor(totalTime / 60),
        minutes = totalTime % 60;

    data.ENTRIES = [...fileData];
    data.ENTERED_TIME = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} (${totalTime} mins)`;

    return Promise.resolve(data);
}

async function getAllEntries() {
    const files = (await fileList(DATA_DIR)).sort(),
        data = [];
    try {
        for (const file of files) {
            const fileData = await readFile(path.join(DATA_DIR, file));
            fileData.forEach(formatEntry);
            [].push.apply(data, fileData);
        }
    } catch (ex) {
        console.log(ex);
    }
    data.sort(sortFn);
    return [...data];
}

async function getEntry(entry) {
    try {
        const filePath = todayFilePath(),
            fileData = await readFile(filePath);
        if (entry.unid) {
            const editEntryIndex = fileData.findIndex(e => e.unid === entry.unid);
            if (editEntryIndex != -1) {
                return { success: true, data: { ...fileData[editEntryIndex] }, reload: false };
            } else {
                return { success: false, message: "Entry not found" };
            }
        }
    } catch (ex) {
        return { success: false, message: ex.message, stack: ex.stack };
    }
}

async function saveEntry(entry) {
    try {
        const filePath = todayFilePath(),
            fileData = await readFile(filePath),
            overlapped = fileData.find(e => {
                return (e.unid != entry.unid) &&
                    (
                        (entry.start == e.start && entry.end == e.end) ||
                        (entry.start > e.start && entry.start < e.end) ||
                        (entry.end > e.start && entry.end < e.end) ||
                        (e.start > entry.start && e.start < entry.end) ||
                        (e.end > entry.start && e.end < entry.end)
                    );
            });
        if (overlapped) {
            return { success: false, message: "Time overlapping with another entry", reload: false };
        }
        if (entry.unid) {
            const editEntryIndex = fileData.findIndex(e => e.unid === entry.unid);
            if (editEntryIndex != -1) {
                fileData[editEntryIndex] = { ...fileData[editEntryIndex], ...entry };
            }
        } else {
            entry.unid = unid();
            fileData.push({ ...entry });
        }
        fileData.sort(sortFn);
        await writeFile(filePath, JSON.stringify(fileData, null, 2));
        return { success: true };
    } catch (ex) {
        return { success: false, message: ex.message, stack: ex.stack };
    }
}

async function deleteEntry(entry) {
    try {
        const filePath = todayFilePath(),
            fileData = await readFile(filePath);
        if (entry.unid) {
            const editEntryIndex = fileData.findIndex(e => e.unid === entry.unid);
            if (editEntryIndex != -1) {
                fileData.splice(editEntryIndex, 1);
            }
        }
        fileData.sort(sortFn);
        await writeFile(filePath, JSON.stringify(fileData, null, 2));
        return { success: true };
    } catch (ex) {
        return { success: false, message: ex.message, stack: ex.stack };
    }
}

async function handleEntryRequest(entry, action) {
    if (action == "add") {
        return await saveEntry(entry);
    }
    if (action == "edit") {
        return await getEntry(entry);
    }
    if (action == "delete") {
        return await deleteEntry(entry);
    }
    if (action == "get_all") {
        return await getAllEntries();
    }
}

module.exports = { getEntries, handleEntryRequest };