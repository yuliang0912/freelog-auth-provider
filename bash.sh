
# 本地自动构建与发布shell脚本

docker stop freelog-auth-provider
docker rm freelog-auth-provider
docker rmi freelog-auth-provider
cd /d/工作/freelog-auth-provider
docker build -t freelog-auth-provider .
docker run --name="freelog-auth-provider" -p 7008:7008  freelog-auth-provider