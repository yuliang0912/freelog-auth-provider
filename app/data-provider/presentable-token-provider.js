/**
 * Created by yuliang on 2017/11/15.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class ContractProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.PresentableToken)
    }

    /**
     * 创建token
     * @param model
     * @returns {*}
     */
    createResourceToken(model) {
        return super.create(model)
    }

    /**
     * 获取最新的token
     * @param presentable
     * @param userId
     */
    getLatestResourceToken(presentableId, userId) {

        let expire = Math.round(new Date().getTime() / 1000) + 5

        return super.model.findOne({
            presentableId, userId, expire: {$gt: expire}
        }).sort({exprie: 'desc'})
    }
}