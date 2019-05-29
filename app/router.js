'use strict';

module.exports = app => {

    const {router, controller} = app
    const {contract, contractEvent, auth} = controller

    //获取合同列表
    router.get('contract-list', '/v1/contracts/list', contract.v1.list)
    router.get('terminated-contracts', '/v1/contracts/terminateContracts', contract.v1.terminatedContracts)
    router.get('release-policy-identity-authorization-test', '/v1/auths/releasePolicyIdentityAuthentication', auth.v2.releasePolicyIdentityAuthentication)
    router.post('batch-sign-release-contracts', '/v1/contracts/batchCreateReleaseContracts', contract.v1.batchCreateReleaseContracts)
    router.get('test-is-can-exec-event', '/v1/contracts/isCanExecEvent', contract.v1.isCanExecEvent)
    router.post('development-test-api', '/v1/contracts/test', contract.v1.testContractFsm)

    //合同事件执行
    router.post('contract-event-payment', '/v1/contracts/events/payment', contractEvent.v1.payment)
    router.post('contract-event-escrowRefunded', '/v1/contracts/events/escrowRefunded', contractEvent.v1.escrowRefunded)
    router.post('contract-event-signingLicenses', '/v1/contracts/events/signingLicenses', contractEvent.v1.signingLicenses)
    router.post('contract-event-escrowConfiscated', '/v1/contracts/events/escrowConfiscated', contractEvent.v1.escrowConfiscated)
    router.post('contract-event-customEventInvoking', '/v1/contracts/events/customEventInvoking', contractEvent.v1.customEventInvoking)


    router.get('/v1/auths/authSchemeIdentityAuth', auth.v1.authSchemeIdentityAuth)
    router.get('/v1/auths/presentableIdentityAuth', auth.v1.presentableIdentityAuth)
    router.get('/v1/auths/presentable/getPresentableSignAuth', auth.v1.getPresentableSignAuth)
    router.get('/v1/auths/presentables/:presentableId/presentableTreeAuthTest', auth.v1.presentableTreeAuthTest)
    router.get('/v1/auths/presentables/getPresentableContractChainAuth', auth.v1.getPresentableContractChainAuth)
    //请求获取presentable资源
    router.get('/v1/auths/presentable/:presentableId.:extName', auth.v1.presentable)
    router.get('/v1/auths/presentable/:presentableId', auth.v1.presentable)
    //请求获取presentable资源的子资源
    router.get('/v1/auths/presentable/subResource/:resourceId', auth.v1.presentableSubResource)
    //直接请求授权资源
    router.get('/v1/auths/resource/:resourceId.:extName', auth.v1.resource)
    router.get('/v1/auths/resource/:resourceId', auth.v1.resource)


    router.resources('contract-info', '/v1/contracts', contract.v1)
};
