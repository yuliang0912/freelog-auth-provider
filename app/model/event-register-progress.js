/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    const EventRegisterProgressSchema = new mongoose.Schema({
        contractId: {type: String, required: true},
        attachInfo: {
            fsmState: {type: String, required: true},
            prevFsmState: {type: String, required: true},
            sourceEventId: {type: String, required: true},
        },
        allEvents: {type: [String], required: true},
        registeredEvents: {type: [String], default: [], required: false},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    EventRegisterProgressSchema.index({contractId: 1}, {unique: true})

    EventRegisterProgressSchema.virtual('progress').get(function () {
        return this.registeredEvents.length / this.allEvents.length
    })

    return mongoose.model('event-register-progress', EventRegisterProgressSchema)
}
