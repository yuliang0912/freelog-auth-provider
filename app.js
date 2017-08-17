/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const mongoDb = require('./app/models/db_start')

module.exports = async (app) => {

    app.on('error', (err, ctx) => {
        if (!err || !ctx) {
            return
        }

        ctx.body = ctx.buildReturnObject(app.retCodeEnum.serverError,
            app.errCodeEnum.autoSnapError,
            err.message || err.toString())
    })

    global.Promise = require('bluebird')


    await mongoDb.connect(app)
}