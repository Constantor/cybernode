docker stop bitcore_connector
docker rm -v bitcore_connector
docker run -d --net host --name bitcore_connector bitcore_connector
docker attach --sig-proxy=false bitcore_connector
