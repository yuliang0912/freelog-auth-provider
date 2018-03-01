/**
 * Created by yuliang on 2017/11/15.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class AuthTokenProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.AuthToken)
    }

    /**
     * 创建token
     * @param model
     * @returns {*}
     */
    createAuthToken(model) {
        return super.create(model)
    }

    /**
     * 获取最新的token
     * @param presentable
     * @param userId
     */
    getLatestAuthToken(condition) {

        if (!super.type.object(condition)) {
            return Promise.reject(new Error("condition must be object"))
        }

        //授权有效期最少还有5秒的token
        condition.expire = {$gt: Math.round(new Date().getTime() / 1000) + 5}

        return super.model.findOne(condition).sort({createDate: 1}).exec()
    }
}