/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const mongoDb = require('./app/models/db_start')
const contractService = require('./app/contract-service/index')
const freelogFetch = require('./app/contract-service/fetch')
const dataProvider = require('./app/data-provider/index')

module.exports = async (app) => {

    app.on('error', (err, ctx) => {
        if (!err || !ctx) {
            return
        }

        ctx.body = ctx.buildReturnObject(app.retCodeEnum.serverError,
            app.errCodeEnum.autoSnapError,
            err.message || err.toString())
    })

    await mongoDb.connect(app).catch(console.log)
    await contractService.runContractService(app)

    dataProvider.registerToApp(app)

    global.eggApp = app
    //
    //
    // let m1 = {
    //     req: (req) => {
    //         req.array = req.array || []
    //         req.array.push('m1')
    //     },
    //     res: (res) => {
    //         res.array = res.array || []
    //         res.array.push('r1')
    //     }
    // }
    //
    // let m2 = {
    //     req: (req) => {
    //         req.array = req.array || []
    //         req.array.push('m2')
    //     },
    //     res: (res) => {
    //         res.array = res.array || []
    //         res.array.push('r2')
    //     }
    // }
    //
    // let request = {'title': '此处是模拟的request对象'}


    // new freelogFetch().use(m1).use(m2).fetch(request).then(response => {
    //     console.log(response.data)
    // })

}