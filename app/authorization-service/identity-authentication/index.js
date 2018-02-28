/**
 * 策略用户与节点身份认证
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const nodeGroupAuth = require('./resource-policy/node-group-auth')
const nodeDomainAuth = require('./resource-policy/node-domain-auth')
const nodeIndividualAuth = require('./resource-policy/node-individual-auth')
const userGroupAuth = require('./presentable-policy/user-group-auth')
const userLoginNameAuth = require('./presentable-policy/user-login-name-auth')

module.exports = {

    /**
     * 资源策略身份认证,逻辑为符合节点域名策略或者分组策略
     * @param policyAuthUsers
     * @param userInfo
     */
    async resourcePolicyIdentityAuth({policy, userInfo, nodeInfo, policyOwnerId}) {
        if (!Array.isArray(policy.users)) {
            throw new Error('错误的策略段')
        }

        let params = {policyAuthUsers: policy.users, nodeInfo, userInfo, policyOwnerId}

        //step1.进行节点域名认证,如果符合策略,则通过认证
        let nodeDomainAuthResult = await nodeDomainAuth.auth(params)
        if (nodeDomainAuthResult.isAuth) {
            return nodeDomainAuthResult
        }

        //step2.进行个人用户身份认证,如果符合个人用户策略,则通过认证
        let nodeIndividualAuthResult = await nodeIndividualAuth.auth(params)
        if (nodeIndividualAuthResult.isAuth) {
            return nodeIndividualAuthResult
        }

        //step3.进行分组认证,如果符合节点分组或者用户分组策略,则通过认证
        let nodeGroupAuthResult = await nodeGroupAuth.auth(params)
        if (nodeGroupAuthResult.isAuth) {
            return nodeGroupAuthResult
        }

        //如果都是默认的,则代表存在第三种未知的方式
        if (nodeGroupAuthResult.authCode === authCodeEnum.Default &&
            nodeDomainAuthResult.authCode === authCodeEnum.Default &&
            nodeIndividualAuthResult.authCode === authCodeEnum.Default) {
            throw Object.assign(new Error('策略中存在系统未知的身份认证方式'), {
                data: {users: policy.users}
            })
        }

        return nodeDomainAuthResult.authCode === authCodeEnum.Default ? nodeGroupAuthResult : nodeDomainAuthResult
    },


    /**
     * presentable策略身份认证,逻辑为符合用户手机号或者email策略或者符合用户分组策略任意条件即可
     * @param policyAuthUsers
     * @param nodeInfo
     */
    async presentablePolicyIdentityAuth({policy, userInfo, nodeInfo}) {
        if (!Array.isArray(policy.users)) {
            throw new Error('错误的策略段')
        }

        let params = {policyAuthUsers: policy.users, userInfo, nodeInfo}

        //step1.进行用户的登录名认证,如果符合策略,则通过认证
        let userLoginNameAuthResult = await userLoginNameAuth.auth(params)
        if (userLoginNameAuthResult.isAuth) {
            return userLoginNameAuthResult
        }

        //step2.进行分组认证,如果符合用户分组策略,则通过认证
        let userGroupAuthResult = await userGroupAuth.auth(params)
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
