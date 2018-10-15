/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose

    const toObjectOptions = {
        transform(doc, ret, options) {
            return Object.assign({recordId: doc.id}, lodash.omit(ret, ['_id']))
        }
    }

    const LicenseSignRecordSchema = new mongoose.Schema({
        contractId: {type: String, required: true},
        eventId: {type: String, required: true},
        licenseIds: {type: [String], required: true},
        status: {type: Number, required: true, default: 0},
        fsmState: {type: String, required: true},
        operationUserId: {type: Number, required: true},
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    LicenseSignRecordSchema.index({contractId: 1, eventId: 1});

    return mongoose.model('license-sign-records', LicenseSignRecordSchema)
}
