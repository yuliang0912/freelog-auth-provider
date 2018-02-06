/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const mongoDb = require('./app/models/db_start')
const subscribe = require('./app/mq-service/subscribe')

module.exports = async (app) => {

    await mongoDb.connect(app).catch(console.error)
    await subscribe(app)
}

