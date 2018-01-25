/**
 * 策略用户与节点身份认证
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const nodeGroupAuth = require('./resource-policy/node-group-auth')
const nodeDomainAuth = require('./resource-policy/node-domain-auth')
const userGroupAuth = require('./presentable-policy/user-group-auth')
const userLoginNameAuth = require('./presentable-policy/user-login-name-auth')

module.exports = {

    /**
     * 资源策略身份认证,逻辑为符合节点域名策略或者分组策略
     * @param policyAuthUsers
     * @param userInfo
     */
    resourcePolicyIdentityAuth: ({policy, nodeInfo}) => {
        if (!Array.isArray(policy.users)) {
            throw new Error('错误的策略段')
        }

        let params = {policyAuthUsers: policy.users, nodeInfo}

        //step1.进行节点域名认证,如果符合策略,则通过认证
        let nodeDomainAuthResult = nodeDomainAuth.auth(params)
        if (nodeDomainAuthResult.isAuth) {
            return nodeDomainAuthResult
        }

        //step2.进行分组认证,如果符合节点分组或者用户分组策略,则通过认证
        let nodeGroupAuthResult = nodeGroupAuth.auth(params)
        if (nodeGroupAuthResult.isAuth) {
            return nodeGroupAuthResult
        }

        //如果都是默认的,则代表没有存在第三种未知的方式
        if (nodeDomainAuthResult.authCode === authCodeEnum.Default && nodeGroupAuthResult.authCode === authCodeEnum.Default) {
            throw new Error('策略中存在系统未知的身份认证方式')
        }

        return nodeDomainAuthResult.authCode === authCodeEnum.Default ? nodeGroupAuthResult : nodeDomainAuthResult
    },


    /**
     * presentable策略身份认证,逻辑为符合用户手机号或者email策略或者符合用户分组策略任意条件即可
     * @param policyAuthUsers
     * @param nodeInfo
     */
    presentablePolicyIdentityAuth: ({policy, userInfo}) => {
        if (!Array.isArray(policy.users)) {
            throw new Error('错误的策略段')
        }

        let params = {policyAuthUsers: policy.users, userInfo}

        //step1.进行用户的登录名认证,如果符合策略,则通过认证
        let userLoginNameAuthResult = userLoginNameAuth.auth(params)
        if (userLoginNameAuthResult.isAuth) {
            return userLoginNameAuthResult
        }

        //step2.进行分组认证,如果符合用户分组策略,则通过认证
        let userGroupAuthResult = userGroupAuth.auth(params)
        if (userGroupAuthResult.isAuth) {
            return userGroupAuthResult
        }

        //如果都是默认的,则代表策略中存在第三种未知的方式
        if (userLoginNameAuthResult.authCode === authCodeEnum.Default && userGroupAuthResult.authCode === authCodeEnum.Default) {
            throw new Error('策略中存在系统未知的身份认证方式')
        }



        //如果未登陆用户并且PUBLIC分组认证失败,则默认为用户登录名策略不通过
        return userLoginNameAuthResult.authCode === authCodeEnum.Default ? userGroupAuthResult : userLoginNameAuthResult
    }
}
