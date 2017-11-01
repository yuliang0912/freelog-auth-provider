/**
 * Created by yuliang on 2017/9/4.
 */

'use strict'

module.exports = appInfo => {
    return {

        middleware: ['errorHandler', 'localUserIdentity'],

        /**
         * 本地开发环境身份信息
         */
        localIdentity: {
            userId: 10022,
            userName: "余亮",
            tokenType: "local"
        }
    }
}

