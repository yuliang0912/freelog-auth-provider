
1. 监听合同状态机状态变更事件

2. 检索出绑定此合约的发行方案列表

3. 对应的方案重新检查自己所解决的发行对应的合约组.然后计算出自己的授权状态是否发生变化

4. 方案的授权如果发生变化,则广播消息 (scheme-auth-changed-event-handler)

5. 系统接收到方案授权状态发生变更,然后检索出所有依赖并解决此版本的发行.然后计算自身的授权状态.之后重复step4.


# 事件具体处理逻辑

## scheme-created-event-handler (监听发行方案被创建事件)

1.获取方案中是否解决了其他发行.

2.如果方案解决了其他发行,则创建发行与依赖的发行之间的关系(release-scheme-auth-relation)

3.保存方案的授权结果,如果方案未解决其他发行,则授权状态为固定授权状态.否则需要等待后续其他事件计算结果.

4.发送重置方案授权结果事件(scheme-auth-result-reset-event-handler),只计算其依赖的上游发行的授权状态,
  合约的授权状态会在定时任务中触发计算(创建方案时,可能还未绑定合约或者合约未初始化).


## scheme-bind-contract-event-handler(发行方案绑定/换绑合约事件)

1.更新发行的依赖关系链信息(release-scheme-auth-relation),重新绑定事件中指定的合同信息.

2.发送重置方案授权结果事件(scheme-auth-result-reset-event-handler),只计算方案的合约部分授权情况.


## release-contract-auth-changed-event-handler(合约授权状态发生变更事件)

1.此事件侦听发行与发行的合约授权状态发生改变事件

2.根据合约ID获取所有绑定此合约的发行方案(release-scheme-auth-relation)

3.发送重置方案授权结果事件(scheme-auth-result-reset-event-handler),只计算方案的合约部分授权情况.,分别通知到每一个关联的方案.此事件只负责分发任务.


## scheme-auth-changed-event-handler(发行方案的授权发生变更事件)

1.检索所有发行依赖表(release-scheme-auth-relation),得到所有依赖此发行的下游发行

2.根据依赖方设定的semver范围,然后与发行的版本匹配,获得依赖方当前最佳匹配的版本号

3.使用匹配得到的版本号与通知事件中发生变更的方案版本号进行对比.如果版本号不一致.则忽略

4.如果依赖的版本号与发生变化的方案版本号一致,则发送重置方案授权结果事件(scheme-auth-result-reset-event-handler),只计算上游授权部分


## scheme-auth-result-reset-event-handler

1.当前事件接受其他事件的指令,然后更新方案的授权信息.可以指定更新自身授权部分或者依赖的发行的授权信息,或者两者都更新

2.更新合约授权状态时,会重新拉去所有的合约状态,与现有的进行对比.如果发生变化,则更新

3.计算出最终的授权状态,与旧有的授权状态对比,如果未发生变更,则终止.如果发生变更.则发送状态变更事件(scheme-auth-changed-event-handler)

4.授权链上scheme-auth-changed-event-handler与本事件(scheme-auth-result-reset-event-handler)一般会循环相互触发,直到授权链所有状态都更新完毕.



