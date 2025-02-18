const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.json');

class Database {
    constructor() {
        this.data = null;
        this.loaded = false;
    }

    async load() {
        try {
            const fileContent = await fs.readFile(DB_PATH, 'utf-8');
            this.data = JSON.parse(fileContent);
            this.loaded = true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, create with default structure
                this.data = {
                    doctors: [],
                    patients: [],
                    clinicalNotes: { notes: [], categories: [] },
                    prescriptions: { active: [], history: [], templates: [] },
                    appointments: { upcoming: [], past: [], cancelled: [] },
                    systemConfig: {
                        workingHours: {},
                        appointmentDurations: {},
                        backupSettings: {}
                    }
                };
                await this.save();
            } else {
                throw error;
            }
        }
    }

    async save() {
        await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2));
    }

    async get(collection) {
        if (!this.loaded) await this.load();
        return this.data[collection];
    }

    async add(collection, item) {
        if (!this.loaded) await this.load();
        if (!this.data[collection]) {
            throw new Error(`Collection ${collection} does not exist`);
        }
        
        if (Array.isArray(this.data[collection])) {
            this.data[collection].push({ ...item, id: Date.now(), createdAt: new Date().toISOString() });
        } else if (typeof this.data[collection] === 'object') {
            // Handle nested collections
            const key = Object.keys(item)[0];
            if (Array.isArray(this.data[collection][key])) {
                this.data[collection][key].push({
                    ...item[key],
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        await this.save();
        return item;
    }

    async update(collection, id, updates) {
        if (!this.loaded) await this.load();
        
        let updated = false;
        if (Array.isArray(this.data[collection])) {
            const index = this.data[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                this.data[collection][index] = {
                    ...this.data[collection][index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                updated = true;
            }
        } else if (typeof this.data[collection] === 'object') {
            // Handle nested collections
            for (const key in this.data[collection]) {
                if (Array.isArray(this.data[collection][key])) {
                    const index = this.data[collection][key].findIndex(item => item.id === id);
                    if (index !== -1) {
                        this.data[collection][key][index] = {
                            ...this.data[collection][key][index],
                            ...updates,
                            updatedAt: new Date().toISOString()
                        };
                        updated = true;
                        break;
                    }
                }
            }
        }

        if (!updated) {
            throw new Error(`Item with id ${id} not found in ${collection}`);
        }

        await this.save();
        return true;
    }

    async delete(collection, id) {
        if (!this.loaded) await this.load();
        
        let deleted = false;
        if (Array.isArray(this.data[collection])) {
            const index = this.data[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                this.data[collection].splice(index, 1);
                deleted = true;
            }
        } else if (typeof this.data[collection] === 'object') {
            // Handle nested collections
            for (const key in this.data[collection]) {
                if (Array.isArray(this.data[collection][key])) {
                    const index = this.data[collection][key].findIndex(item => item.id === id);
                    if (index !== -1) {
                        this.data[collection][key].splice(index, 1);
                        deleted = true;
                        break;
                    }
                }
            }
        }

        if (!deleted) {
            throw new Error(`Item with id ${id} not found in ${collection}`);
        }

        await this.save();
        return true;
    }
}

module.exports = new Database(); 