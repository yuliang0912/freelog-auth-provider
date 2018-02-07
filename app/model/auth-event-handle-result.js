'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const authEventHandleResult = new mongoose.Schema({
        baseInfo: {
            messageId: {type: String, required: true},
            exchange: {type: String, required: true},
            routingKey: {type: String, required: true}
        },
        message: {}, //混合类型,事件的消息数据
        headers: {}, //混合类型,事件的header
        result: {},  //混合类型,事件执行的结果
        error: {}    //混合类型,事件执行的错误异常信息
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    return mongoose.model('auth-event-handle-results', authEventHandleResult)
}