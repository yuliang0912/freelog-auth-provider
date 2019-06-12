/**
 * Created by yuliang on 2017/11/15.
 */

'use strict'

const lodash = require('lodash')
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

        const condition = lodash.pick(model, ['targetId', 'identityType', 'partyTwo'])

        return super.findOneAndUpdate(condition, model, {new: true}).then(authToken => {
            return authToken || super.create(model)
        })
    }

    /**
     * 获取有效的token
     * @param presentable
     * @param userId
     */
    async getEffectiveAuthToken(condition) {

        //授权有效期最少还有5秒的token
        condition.expire = {$gt: Date()}

        return super.findOne(condition)
    }

    /**
     * 获取有效的tokens
     * @param presentable
     * @param userId
     */
    async getEffectiveAuthTokens(condition) {

        //授权有效期最少还有5秒的token
        condition.expire = {$gt: Date()}

        return super.find(condition)
    }
}