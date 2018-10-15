'use strict'

module.exports = {

    /**
     * 发起中
     */
    Pending: 1,

    /**
     * 发起方已确认(确认函交易)
     */
    InitiatorConfirmed: 2,

    /**
     * 完成交易
     */
    Successful: 3,

    /**
     * 交易失败
     */
    Failed: 4,

    /**
     * 发起方放弃交易(确认函被否)
     */
    InitiatorAbandon: 5
}