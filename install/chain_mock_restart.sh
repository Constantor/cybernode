docker stop chain_mock
docker rm -v chain_mock
docker run -d --net host -p 8092:8092 --name chain_mock chain_mock
docker attach --sig-proxy=false chain_mock
