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
        return super.findOneAndUpdate({
            targetId: model.targetId,
            partyTwo: model.partyTwo,
            partyTwoUserId: model.partyTwoUserId,
        }, model).then(oldInfo => {
            return oldInfo ? super.findById(oldInfo._id) : super.create(model)
        })
    }

    /**
     * 获取有效的token
     * @param presentable
     * @param userId
     */
    getEffectiveAuthToken(condition) {

        if (!super.type.object(condition)) {
            return Promise.reject(new Error("condition must be object"))
        }

        //授权有效期最少还有5秒的token
        condition.expire = {$gt: Math.round(new Date().getTime() / 1000) + 5}

        return super.model.findOne(condition).exec()
    }
}