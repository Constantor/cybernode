CREATE USER docker WITH PASSWORD 'gfhjkm';
CREATE DATABASE chain;
GRANT ALL PRIVILEGES ON DATABASE chain TO docker;
CREATE DATABASE chain_test;
GRANT ALL PRIVILEGES ON DATABASE chain_test TO docker;