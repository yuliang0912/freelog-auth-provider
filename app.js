/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const path = require('path')
const mongoDb = require('./app/models/db_start')
const contractService = require('./app/contract-service/index')

module.exports = async (app) => {

    await mongoDb.connect(app).catch(console.log)
    await contractService.runContractService(app)

    global.eggApp = app

    app.loader.loadToApp(path.join(app.config.baseDir, 'app/authorization-service'), 'authService', {
        initializer: (obj, opt) => {
            return obj
        }
    });
}