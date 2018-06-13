/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const subscribe = require('./app/mq-service/subscribe')

module.exports = async (app) => {
    await subscribe(app)
}


var a ={a:1,b:2,c:3}


