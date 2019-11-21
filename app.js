'use strict'

module.exports = class AppBootHook {

    constructor(app) {
        this.app = app;
    }

    async willReady() {
        await this.app.rabbitClient.connect()
    }
}