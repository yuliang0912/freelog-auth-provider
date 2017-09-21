/**
 * Created by yuliang on 2017/8/30.
 */

'use strict'

/**
 * 用户账号认证
 */

module.exports = (authContext) => {

    let isAuth = authContext.policySegment.users
        .some(t => t === authContext.userInfo.userName)

    if (!isAuth) {
        authContext.errors.push({"user_acount_auth": "auth faild"})
    }
}



/**
 *let authContext = {
    policySegment,
    userId,
    userInfo
    }
 * @type {{policySegment: *, userId: *, userInfo: *}}
 */
