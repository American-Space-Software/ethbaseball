import { inject, injectable } from "inversify"

import {Umzug, SequelizeStorage} from 'umzug'


@injectable()
class SchemaService {

    public sequelize

    constructor(
        @inject("sequelize") private sequelizeInit:Function
    ) {}

    async load() {

        //Init database

        this.sequelize = await this.sequelizeInit()

        await this.runMigrations()

        // await this.sequelize.query("PRAGMA busy_timeout=5000;")
        // await this.sequelize.query("PRAGMA journal_mode=WAL;")

    }

    async runMigrations() {

        const umzug = new Umzug({
            migrations: {glob: 'db-migrations/*.cjs'},
            context: this.sequelize.getQueryInterface(),
            storage: new SequelizeStorage({sequelize: this.sequelize}),
            logger: undefined,
        })

        await umzug.up()

    }

}

export {
    SchemaService
}