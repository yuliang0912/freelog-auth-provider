/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

const mongoose = require('mongoose')

const toObjectOptions = {
    transform: function (doc, ret, options) {
        return {
            accessToken: ret._id,
            userId: ret.userId,
            resourceId: ret.resourceId,
            contractId: ret.contractId,
            expireDate: ret.expireDate,
            status: ret.status
        }
    }
}

const ResourceTokenSchema = new mongoose.Schema({
    userId: {type: Number, required: true}, //用户ID
    resourceId: {type: String, required: true}, //资源ID
    contractId: {type: String, required: true}, //合同ID
    expireDate: {type: Date, required: true}, //合同过期时间
    status: {type: Number, required: true, default: 0},
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    toJSON: toObjectOptions,
    toObject: toObjectOptions
})

module.exports = mongoose.model('resourceToken', ResourceTokenSchema)
