/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const path = require('path')
const mongoDb = require('./app/models/db_start')
const subscribe = require('./app/mq-service/subscribe')

module.exports = async (app) => {

    await mongoDb.connect(app).catch(console.error)
    await subscribe(app)

    app.loader.loadToApp(path.join(app.config.baseDir, 'app/authorization-service'), 'authService');

}

