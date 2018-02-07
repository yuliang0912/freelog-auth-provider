'use strict'


const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class EventHandleResultProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.AuthEventHandleResult)
    }

    /**
     * 创建合约
     * @param model
     * @returns {Promise.<TResult>}
     */
    create(model) {
        return super.create(model)
    }

    /**
     * 获取数量
     * @param condition
     * @returns {Promise.<*>|Promise}
     */
    getCount(condition) {
        return super.count(condition)
    }
}
