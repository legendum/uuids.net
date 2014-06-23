# Setup on Ubuntu 12

As root...

* apt-get -y install git
* apt-get -y install nginx
* apt-get -y install libgdbm-dev
* apt-get -y install build-essential zlib1g-dev libssl-dev libffi-dev libreadline6-dev libyaml-dev
* wget http://cache.ruby-lang.org/pub/ruby/2.1/ruby-2.1.2.tar.bz2
* tar xfj ruby-2.1.2.tar.bz2
* cd ruby-2.1.2
* ./configure && make && make install
* cd ..
* wget http://nodejs.org/dist/v0.10.29/node-v0.10.29-linux-x64.tar.gz
* tar xfz node-v0.10.29-linux-x64.tar.gz
* cd node-v0.10.29-linux-x64
* mv bin/* /usr/local/bin/
* mv include/node /usr/local/include/
* mv lib/node_modules /usr/local/lib/
* mv share/man/man1/node.1 /usr/local/share/man/man1/
* echo "export NODE_PATH=/usr/local/lib" >> ~/.bashrc
* source ~/.bashrc
* npm install -g mocha
* gem install god
