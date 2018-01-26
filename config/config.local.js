/**
 * Created by yuliang on 2017/9/4.
 */

'use strict'

module.exports = appInfo => {
    return {

        middleware: ['errorHandler', 'localUserIdentity'],

        // mongo: {
        //     uri: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/auth?replicaSet=mgset-5016983"
        // },

        /**
         * 本地开发环境身份信息
         */
        /**
         * 本地开发环境身份信息
         */
        localIdentity: {
            userId: 10027,
            userName: "余亮",
            nickname: "烟雨落叶",
            email: "4896819@qq.com",
            mobile: "",
            tokenSn: "86cd7c43844140f2a4101b441537728f",
            userRol: 1,
            status: 1,
            createDate: "2017-10-20T16:38:17.000Z",
            updateDate: "2017-11-01T15:53:29.000Z",
            tokenType: "jwt"
        }
    }
}

